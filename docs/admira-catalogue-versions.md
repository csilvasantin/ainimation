# Edit an Admira catalogue asset and save a linked version

Stock opens `studio.html` for Director or `interactivos/` for structured interactive projects. The existing `admiraStock*` parameters carry the source asset. `admiraEditable=director|interactive` requests its saved source from `https://api.admira.store/stock/editor-project/:id`. `admiraReturnUrl` preserves the catalogue host, language and client filter; only the public Admira/Pixeria Stock paths are accepted.

A new publication sends an `ainimation.editor.v1` envelope (`kind`, `plan`) as `editorProject` to `/stock/publish`, together with the rendered WebM or interactive HTML. `externalRef` identifies the immediate parent. The Stock service validates that parent, writes a new asset and immutable source, and returns `editorProjectUrl`, `versionRoot`, `id` and the index receipt. The editable source is separate from the catalogue index. Matching rendered bytes must not collapse distinct editable versions or steal the original asset's hash mapping.

Only after successful confirmation does the editor return to `?highlight=<new-id>&origen=<root-id>`. On error the editor and local project remain available. If further edits occurred during upload, the editor displays a link to the saved revision and preserves the newer work.

Director preserves the previous workspace in `ainimation:before-admira-edit`. On reopen, query parameters are removed after the source is saved locally, so reload does not discard subsequent edits. Structured interactives open as a new local library entry and preserve existing projects. Blob media is embedded into a portable source; the source has a 24 MiB limit.

Older rendered videos open as a new single-media composition. Older HTML interactives without editable source cannot reconstruct their original layers or behaviours; the editor explains that their original project must be imported. New interactive publications retain both their HTML and their editable source.

Release order: deploy the Stock service from the matching pixer-worker change, publish this editor, then merge the Pixeria catalogue change and regenerate admira.studio through its existing mirror process. Do not edit the generated mirror manually. No migration or replacement of existing assets is required.

Validation includes the Stock handler with an in-memory R2 bucket, editor source and return-link tests, catalogue descendant/link tests in ES and EN, and a Chrome headless check editing and publishing a video and structured interactive before returning to the catalogue.
