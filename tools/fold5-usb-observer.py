#!/usr/bin/env python3
"""Read-only ADB companion for a native Android digital twin (Python stdlib).

Example (the serial is deliberately explicit):
  python3 tools/fold5-usb-observer.py --serial SERIAL --once --dry-run
  python3 tools/fold5-usb-observer.py --serial SERIAL

This process never starts an activity, changes preferences, captures a screen or
sends a player command. It publishes observations, not an APK heartbeat, video
frames, playhead position or evidence of acoustic output. A disconnected device
does not publish. Stop the observer with Ctrl-C; the server's lastSeen then ages.
The device's own `pantalla` remains its identity. Manufacturer/family/tag routing
belongs to the external device registry, not this observer or the player APK.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Callable, Optional


USER_AGENT = "AdmiraAndroidUSBObserver/1.0"
NOW_URL = "https://api.admira.store/signage/now"
STOCK_URL = "https://stock.admira.store/stock/index.json"
PREF_KEYS = frozenset({"pantalla", "liveTag", "silencio", "ultima"})
SCREEN_RE = re.compile(r"^[a-zA-Z0-9_-]{1,60}$")


class ObservationError(RuntimeError):
    """An observation could not be completed; never publish an old snapshot."""


class DeviceDisconnected(ObservationError):
    pass


class AdbClient:
    def __init__(self, serial: str, package: str, timeout: float = 8.0):
        if not serial or any(c.isspace() for c in serial):
            raise ValueError("An explicit ADB serial without whitespace is required")
        if not re.fullmatch(r"[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+", package):
            raise ValueError("Invalid Android package")
        self.serial, self.package, self.timeout = serial, package, timeout

    def run(self, *args: str, empty_on_failure: bool = False) -> str:
        try:
            result = subprocess.run(
                ["adb", "-s", self.serial, *args],
                capture_output=True, text=True, timeout=self.timeout, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            # Do not leak stderr, argv, serial, preference XML or other app data.
            raise ObservationError("ADB command unavailable or timed out") from exc
        if result.returncode:
            if empty_on_failure:
                return ""
            raise ObservationError("ADB observation failed")
        return result.stdout.strip()

    def assert_connected(self) -> None:
        if self.run("get-state", empty_on_failure=True) != "device":
            raise DeviceDisconnected("USB device is not authorized and connected")


def parse_preferences(xml: str) -> dict:
    if len(xml) > 1024 * 1024:
        raise ObservationError("Player preference file exceeds the size limit")
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise ObservationError("Player preferences could not be parsed") from exc
    result = {}
    for element in root:
        name = element.attrib.get("name")
        if name not in PREF_KEYS:
            continue
        value = element.text if element.text is not None else element.attrib.get("value", "")
        result[name] = value[:160]
    if not SCREEN_RE.fullmatch(result.get("pantalla", "")):
        raise ObservationError("Player pantalla identity is missing or invalid")
    return result


def parse_fold_state(text: str) -> str:
    # Base state is physical posture; an app can override the committed state.
    for field in ("mBaseState", "mCommittedState"):
        match = re.search(r"\b" + field + r"=[^\n]*?name=['\"]?([A-Z_]+)", text)
        if not match:
            continue
        name = match.group(1)
        if name == "CLOSED":
            return "closed"
        if name in {"HALF_OPENED", "TENT"}:
            return "half-opened"
        if name == "OPENED":
            return "opened"
    return "unknown"


@dataclass(frozen=True)
class Display:
    width: int = 0
    height: int = 0
    rotation: int = 0
    on: bool = False


def parse_display(text: str) -> Display:
    physical = []
    logical = []
    for line in text.splitlines():
        if "DisplayDeviceInfo{" in line:
            size = re.search(r"[\",]\s*(\d+) x (\d+),", line)
            unique = re.search(r'uniqueId="([^"]+)"', line)
            state = re.search(r"(?:^|[, ])state ([A-Z_]+)", line)
            if size and state:
                physical.append((unique.group(1) if unique else "", int(size[1]), int(size[2]), state[1]))
        if "mOverrideDisplayInfo=DisplayInfo{" in line or "mDisplayInfo=DisplayInfo{" in line:
            size = re.search(r"\breal (\d+) x (\d+)", line)
            unique = re.search(r'uniqueId[ =]+"([^"]+)"', line)
            state = re.search(r"\bstate ([A-Z_]+)", line)
            rotation = re.search(r"\brotation ([0-3])\b", line)
            if size and state:
                logical.append((unique.group(1) if unique else "", int(size[1]), int(size[2]), state[1], int(rotation[1]) * 90 if rotation else 0))
    active = next((row for row in physical if row[3] == "ON"), None)
    if active:
        match = next((row for row in logical if row[0] and row[0] == active[0]), None)
        if match:
            return Display(match[1], match[2], match[4], True)
        return Display(active[1], active[2], 0, True)
    if not physical:
        # Some Android versions omit physical devices in dumpsys output.
        active_logical = next((row for row in logical if row[3] == "ON"), None)
        if active_logical:
            return Display(active_logical[1], active_logical[2], active_logical[4], True)
    return Display()  # Do not label an OFF cover panel as an active screen.


def resumed_package(text: str) -> Optional[str]:
    for field in ("topResumedActivity", "mResumedActivity", "ResumedActivity"):
        for line in text.splitlines():
            if field not in line:
                continue
            match = re.search(r"\bu\d+\s+([a-zA-Z0-9_.]+)/", line)
            if match:
                return match[1]
    return None


@dataclass(frozen=True)
class Audio:
    active: bool = False
    audible: bool = False


def parse_audio(text: str, uid: Optional[int], pids: set[int]) -> Audio:
    active, audible = False, False
    for line in text.splitlines():
        if "AudioPlaybackConfiguration" not in line:
            continue
        owner = re.search(r"\bu/pid:(\d+)/(\d+)\b", line)
        if not owner or not pids or int(owner[2]) not in pids:
            continue
        if uid is not None and int(owner[1]) != uid:
            continue
        if not re.search(r"\bstate:started\b", line):
            continue
        active = True
        if "mutedState:none" in line:
            audible = True
    return Audio(active, audible)


@dataclass(frozen=True)
class Observation:
    screen: str
    fold_state: str
    display: Display
    native_visible: bool
    audio: Audio
    model: str
    os_version: str
    native_version: str
    last_item: str


def collect(adb: AdbClient) -> Observation:
    adb.assert_connected()
    prefs = parse_preferences(adb.run("exec-out", "run-as", adb.package, "cat", "shared_prefs/admira.xml"))
    package_info = adb.run("shell", "dumpsys", "package", adb.package)
    version = re.search(r"\bversionName=([^\s]+)", package_info)
    uid = re.search(r"\buserId=(\d+)", package_info)
    pids = {int(n) for n in adb.run("shell", "pidof", adb.package, empty_on_failure=True).split() if n.isdigit()}
    fold = parse_fold_state(adb.run("shell", "dumpsys", "device_state"))
    display = parse_display(adb.run("shell", "dumpsys", "display"))
    top = resumed_package(adb.run("shell", "dumpsys", "activity", "activities"))
    audio = parse_audio(adb.run("shell", "dumpsys", "audio"), int(uid[1]) if uid else None, pids)
    # Confirm connectivity after the observation too; never post a half snapshot.
    model = adb.run("shell", "getprop", "ro.product.model")[:80]
    os_version = adb.run("shell", "getprop", "ro.build.version.release")[:40]
    adb.assert_connected()
    return Observation(prefs["pantalla"], fold, display, top == adb.package and display.on,
                       audio, model, os_version, version[1][:60] if version else "unknown", prefs.get("ultima", ""))


class StockCatalogue:
    def __init__(self, ttl: float = 300.0, clock: Callable[[], float] = time.monotonic):
        self.ttl, self.clock, self.loaded_at = ttl, clock, None
        self.items = {}

    def find(self, item_id: str) -> Optional[dict]:
        if not item_id:
            return None
        if self.loaded_at is None or self.clock() - self.loaded_at >= self.ttl:
            request = urllib.request.Request(STOCK_URL, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=8) as response:
                raw = response.read(12 * 1024 * 1024 + 1)
            if len(raw) > 12 * 1024 * 1024:
                raise ObservationError("Stock catalogue exceeds the size limit")
            data = json.loads(raw)
            if not isinstance(data, dict) or not isinstance(data.get("items"), list):
                raise ObservationError("Stock catalogue has an invalid shape")
            self.items = {}
            for row in data.get("items", []):
                if not isinstance(row, dict) or not isinstance(row.get("id"), str):
                    continue
                url = row.get("url")
                parsed = urllib.parse.urlsplit(url) if isinstance(url, str) else None
                if not parsed or parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or len(url) > 4096:
                    continue
                item = {"id": row["id"][:100], "title": row.get("title", "")[:180] if isinstance(row.get("title"), str) else "",
                        "type": row.get("type", "")[:40] if isinstance(row.get("type"), str) else "", "url": url}
                duration = row.get("dur", row.get("seconds"))
                if isinstance(duration, (int, float)) and not isinstance(duration, bool) and math.isfinite(duration) and duration > 0:
                    item["dur"] = duration
                self.items[item["id"]] = item
            self.loaded_at = self.clock()
        item = self.items.get(item_id)
        return dict(item) if item else None


def payload_for(observation: Observation, producer: str, catalogue: StockCatalogue, name: str = "") -> dict:
    o = observation
    playing = o.native_visible and o.audio.active
    error = None
    if o.fold_state == "closed":
        status = "closed-audio" if o.audio.active else "closed"
        if not playing:
            error = ("Observación USB: Fold cerrado; audio activo sin player visible en la cubierta."
                     if o.audio.active else "Observación USB: Fold cerrado; sin pantalla del player ni audio activo.")
    elif not o.native_visible:
        status, error = "native-background", "Observación USB: el player nativo no está visible."
    else:
        status = o.fold_state
        if not o.audio.active:
            error = "Observación USB: player visible, sin pista de audio activa."
    health = {"ok": playing, "status": status}
    if error:
        health["error"] = error
    item = catalogue.find(o.last_item) if playing and o.last_item else None
    return {
        "screen": o.screen, "item": item, "producer": producer,
        "loc": o.screen, "locName": (name or o.model)[:80], "machine": producer,
        "role": "native-usb-observer", "version": "USB observer 1.0 · Android " + o.native_version,
        "health": health,
        "device": {
            "display": {"width": o.display.width, "height": o.display.height, "rotation": o.display.rotation,
                        "orientation": "landscape" if o.display.width > o.display.height else "portrait" if o.display.height else "off",
                        "visible": 100 if o.native_visible else 0, "playbackPaused": not o.audio.active},
            "system": {"os": "Android", "osVersion": o.os_version, "platform": o.model},
            "hardware": {"architecture": o.model},
            "software": {"player": "Admira Android native · USB observer", "playerVersion": o.native_version,
                         "engine": "ExoPlayer · external USB observation", "userAgent": USER_AGENT},
        },
    }


def publish(payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(NOW_URL, data=data, method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=10) as response:
        result = json.loads(response.read(32 * 1024))
    if not isinstance(result, dict) or not result.get("ok"):
        raise ObservationError("Telemetry was not accepted")
    return result


def observe_once(adb: AdbClient, catalogue: StockCatalogue, producer: str, *, dry_run: bool, name: str = "",
                 publisher: Callable[[dict], dict] = publish) -> dict:
    observation = collect(adb)
    try:
        payload = payload_for(observation, producer, catalogue, name)
    except (OSError, ValueError, urllib.error.URLError, ObservationError):
        # Catalogue/network errors cannot turn a genuine USB observation into a
        # fabricated item. Publish the posture without any cached previous item.
        class NoItem:
            def find(self, _):
                return None
        payload = payload_for(observation, producer, NoItem(), name)
    if not dry_run:
        # Fetching catalogue metadata can take several seconds. If USB vanished
        # meanwhile, do not advertise that older observation as a live heartbeat.
        adb.assert_connected()
        publisher(payload)
    return {"at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "screen": observation.screen, "state": payload["health"]["status"],
            "nativeVisible": observation.native_visible, "audioActive": observation.audio.active,
            "audioUnmuted": observation.audio.audible, "itemId": (payload["item"] or {}).get("id"),
            "published": not dry_run}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--serial", required=True, help="Explicit authorized ADB device serial (never auto-select)")
    parser.add_argument("--package", default="tv.admira.player")
    parser.add_argument("--name", default="", help="Optional display name; does not change routing or device identity")
    parser.add_argument("--interval", type=float, default=15.0)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="Read ADB/catalogue and print a safe summary; do not publish telemetry")
    args = parser.parse_args(argv)
    if args.interval < 5 or not math.isfinite(args.interval):
        parser.error("--interval must be at least 5 seconds")
    adb = AdbClient(args.serial, args.package)
    producer = "android-usb-" + hashlib.sha256((args.serial + ":" + args.package).encode()).hexdigest()[:16]
    catalogue, failures = StockCatalogue(), 0
    while True:
        try:
            summary = observe_once(adb, catalogue, producer, dry_run=args.dry_run, name=args.name)
            failures = 0
            print(json.dumps(summary, ensure_ascii=False), flush=True)
        except KeyboardInterrupt:
            return 0
        except (ObservationError, OSError, ValueError, urllib.error.URLError):
            failures += 1
            print(json.dumps({"state": "unavailable", "published": False,
                              "message": "USB observation or telemetry unavailable; no stale heartbeat published"}), flush=True)
            if args.once:
                return 2
        if args.once:
            return 0
        try:
            time.sleep(min(60.0, args.interval * (2 ** min(failures, 3))))
        except KeyboardInterrupt:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
