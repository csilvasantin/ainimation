# Galaxy Z Fold5 · Blender source

Rebuild without opening a window:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python digital-twins/galaxy-z-fold5/model/galaxy-z-fold5.py \
  -- digital-twins/galaxy-z-fold5
```

The script creates the editable `.blend`, GLB, poster and two offline pose-check renders.
The `.blend` includes a separate preview studio collection; the GLB contains only
the phone. The renders are illustrations, not captures of a physical player.

One model unit is 10 mm. Nominal body dimensions from
[Samsung's Fold5 announcement](https://news.samsung.com/global/samsung-galaxy-z-flip5-and-galaxy-z-fold5-delivering-flexibility-and-versatility-without-compromise)
are 129.9 × 154.9 × 6.1 mm open and 67.1 × 154.9 × 13.4 mm closed.
Camera protrusions, ports and side buttons extend beyond the nominal body. Small
mechanical details and the moving hinge are a visual reconstruction, not CAD.

## Web transforms

GLB uses Y up. Interior faces +Y and the length runs along Z. Scale the model by
`3 / 12.99` for a nominal open width of three world units.

```js
const beta = (180 - openingDegrees) * Math.PI / 360; // 180 flat, 90 Flex, 0 closed
foldLeft.rotation.z = -beta;
foldRight.rotation.z = beta;
hingeShell.position.y = 0.305 + 0.365 * Math.sin(beta);
```

`FoldLeft` and `FoldRight` share local pivot `[0, 0.67, 0]`. `HingeShell` is a
third articulated group. They are children of `GalaxyZFold5`. In Blender the
editable root custom property `opening_degrees` drives all three groups.

`ScreenLeft` and `ScreenRight` already contain UVs for the left and right halves
of one continuous image: U `0…0.5` and `0.5…1`, V `0…1`. Assign the same runtime
canvas texture to both without a second repeat/offset transform. Use the usual
GLTF texture setting `flipY = false`. Their normals face the interior.

`CoverScreen` is the rear face of the left half, with its own full UV range and
an outward-facing normal. Three camera assemblies are on the rear of the right
half: `CameraRing1…3`, `CameraLens1…3`. Other useful names are `SideButton`,
`VolumeUp`, `VolumeDown`, `UsbCPort` and `SamsungRearMark`.

`geometry-report.json` records complete mesh bounds for open/Flex/closed poses,
including protrusions. The generator checks that neither articulated leaf crosses
the central X plane in those poses. No player identities, hardware tags or
network/control code are included in these assets.
