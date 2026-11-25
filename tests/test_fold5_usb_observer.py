"""Read-only USB observer contracts; no ADB device or network required."""
import importlib.util
from pathlib import Path
import sys
import unittest

PATH = Path(__file__).resolve().parents[1] / "tools" / "fold5-usb-observer.py"
SPEC = importlib.util.spec_from_file_location("fold5_usb_observer", PATH)
observer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = observer
SPEC.loader.exec_module(observer)


PREFS = """<map><string name="pantalla">fold-carlos-pruebas</string>
<string name="ultima">song-1981</string><string name="liveTag">samsung-fold</string>
<boolean name="silencio" value="false"/><string name="token">not-for-publication</string>
<string name="aprendidas">private-state</string></map>"""
DISPLAY = """DisplayDeviceInfo{"Interior": uniqueId="local:inner", 1812 x 2176, rotation 0, state ON, committedState ON}
DisplayDeviceInfo{"Cover": uniqueId="local:cover", 904 x 2316, rotation 0, state OFF, committedState OFF}
mOverrideDisplayInfo=DisplayInfo{"Interior", displayId 0, real 2176 x 1812, rotation 3, state ON, uniqueId "local:inner"}
mOverrideDisplayInfo=DisplayInfo{"Cover", displayId 1, real 904 x 2316, rotation 0, state OFF, uniqueId "local:cover"}"""
ACTIVITY = "topResumedActivity=ActivityRecord{123 u0 tv.admira.player/.MainActivity t148}"
AUDIO = """AudioPlaybackConfiguration piid:1 u/pid:10059/3058 state:started mutedState:none
AudioPlaybackConfiguration piid:2 u/pid:10001/4555 state:started mutedState:none"""


class Catalogue:
    def __init__(self):
        self.calls = []

    def find(self, item_id):
        self.calls.append(item_id)
        return {"id": item_id, "title": "Best Songs of 1981", "type": "video", "url": "https://media.example/song.mp4"}


class FixtureAdb:
    package = "tv.admira.player"

    def __init__(self):
        self.connected = True
        self.commands = []
        self.posture = "OPENED"
        self.activity = ACTIVITY
        self.audio = AUDIO

    def assert_connected(self):
        if not self.connected:
            raise observer.DeviceDisconnected("disconnected")

    def run(self, *args, **kwargs):
        self.commands.append(args)
        table = {
            ("exec-out", "run-as", self.package, "cat", "shared_prefs/admira.xml"): PREFS,
            ("shell", "dumpsys", "package", self.package): "userId=10059\nversionName=1.1.4",
            ("shell", "pidof", self.package): "3058",
            ("shell", "dumpsys", "device_state"): "mBaseState=Optional[DeviceState{identifier=3, name='" + self.posture + "'}]",
            ("shell", "dumpsys", "display"): DISPLAY,
            ("shell", "dumpsys", "activity", "activities"): self.activity,
            ("shell", "dumpsys", "audio"): self.audio,
            ("shell", "getprop", "ro.product.model"): "SM-F946B",
            ("shell", "getprop", "ro.build.version.release"): "17",
        }
        return table[args]


class ObserverTests(unittest.TestCase):
    def test_preferences_allowlist_and_identity(self):
        parsed = observer.parse_preferences(PREFS)
        self.assertEqual(set(parsed), {"pantalla", "ultima", "liveTag", "silencio"})
        self.assertNotIn("not-for-publication", str(parsed))
        with self.assertRaises(observer.ObservationError):
            observer.parse_preferences('<map><string name="pantalla">https://wrong.example</string></map>')

    def test_physical_posture_ignores_app_override(self):
        text = "mCommittedState=Optional[DeviceState{identifier=5, name='CONCURRENT_OUTER_DEFAULT'}]\nmBaseState=Optional[DeviceState{identifier=0, name='CLOSED'}]"
        self.assertEqual(observer.parse_fold_state(text), "closed")
        self.assertEqual(observer.parse_fold_state("mCommittedState=Optional[DeviceState{identifier=2, name='HALF_OPENED'}]"), "half-opened")
        self.assertEqual(observer.parse_fold_state("unrecognized"), "unknown")

    def test_active_display_uses_logical_rotation(self):
        self.assertEqual(observer.parse_display(DISPLAY), observer.Display(2176, 1812, 270, True))
        self.assertEqual(observer.parse_display(DISPLAY.replace("state ON", "state OFF")), observer.Display())

    def test_audio_is_scoped_to_native_uid_and_pid(self):
        self.assertEqual(observer.parse_audio(AUDIO, 10059, {3058}), observer.Audio(True, True))
        self.assertEqual(observer.parse_audio(AUDIO, 10059, set()), observer.Audio())
        self.assertEqual(observer.parse_audio(AUDIO, 10060, {3058}), observer.Audio())
        self.assertEqual(observer.parse_audio(AUDIO.replace("mutedState:none", "mutedState:streamVolume"), 10059, {3058}), observer.Audio(True, False))

    def test_other_foreground_app_never_reports_native_item(self):
        adb, catalogue = FixtureAdb(), Catalogue()
        adb.activity = "topResumedActivity=ActivityRecord{123 u0 com.sec.android.app.launcher/.LauncherActivity t2}"
        payload = observer.payload_for(observer.collect(adb), "usb-fixture", catalogue)
        self.assertEqual(payload["health"]["status"], "native-background")
        self.assertFalse(payload["health"]["ok"])
        self.assertIsNone(payload["item"])
        self.assertEqual(catalogue.calls, [])

    def test_fold_close_audio_then_stop_then_reopen(self):
        adb, catalogue = FixtureAdb(), Catalogue()
        opened = observer.payload_for(observer.collect(adb), "usb-fixture", catalogue)
        self.assertEqual(opened["item"]["id"], "song-1981")
        self.assertEqual(opened["health"], {"ok": True, "status": "opened"})
        adb.posture, adb.activity = "CLOSED", ""
        closed_audio = observer.payload_for(observer.collect(adb), "usb-fixture", catalogue)
        self.assertEqual(closed_audio["health"]["status"], "closed-audio")
        self.assertIsNone(closed_audio["item"])
        adb.audio = ""
        closed = observer.payload_for(observer.collect(adb), "usb-fixture", catalogue)
        self.assertEqual(closed["health"]["status"], "closed")
        self.assertTrue(closed["device"]["display"]["playbackPaused"])
        adb.posture, adb.activity, adb.audio = "OPENED", ACTIVITY, AUDIO
        self.assertEqual(observer.payload_for(observer.collect(adb), "usb-fixture", catalogue)["health"]["status"], "opened")

    def test_disconnect_never_republishes_previous_state(self):
        adb, catalogue, posted = FixtureAdb(), Catalogue(), []
        observer.observe_once(adb, catalogue, "usb-fixture", dry_run=False, publisher=lambda body: posted.append(body))
        adb.connected = False
        with self.assertRaises(observer.DeviceDisconnected):
            observer.observe_once(adb, catalogue, "usb-fixture", dry_run=False, publisher=lambda body: posted.append(body))
        self.assertEqual(len(posted), 1)

    def test_disconnect_during_catalogue_fetch_does_not_publish(self):
        adb, posted = FixtureAdb(), []
        class DisconnectingCatalogue(Catalogue):
            def find(self, item_id):
                adb.connected = False
                return super().find(item_id)
        with self.assertRaises(observer.DeviceDisconnected):
            observer.observe_once(adb, DisconnectingCatalogue(), "usb-fixture", dry_run=False,
                                  publisher=lambda body: posted.append(body))
        self.assertEqual(posted, [])

    def test_dry_run_only_uses_read_commands_and_safe_summary(self):
        adb, catalogue, posted = FixtureAdb(), Catalogue(), []
        summary = observer.observe_once(adb, catalogue, "usb-fixture", dry_run=True, publisher=lambda body: posted.append(body))
        self.assertFalse(summary["published"])
        self.assertEqual(posted, [])
        self.assertNotIn("https://", str(summary))
        self.assertNotIn("not-for-publication", str(summary))
        self.assertTrue(all(args[0] in {"shell", "exec-out"} for args in adb.commands))
        self.assertFalse(any("input" in args or "am" in args or "screencap" in args for args in adb.commands))


if __name__ == "__main__":
    unittest.main()
