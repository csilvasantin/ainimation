# Edit an Admira catalogue asset and save a linked version

Stock opens `studio.html` for Director or `interactivos/` for structured interactive projects. The existing `admiraStock*` parameters carry the source asset. `admiraEditable=director|interactive` requests its saved source from `https://api.admira.store/stock/editor-project/:id`. `admiraReturnUrl` preserves the catalogue host, language and client filter; only the public Admira/Pixeria Stock paths are accepted.

A new publication sends an `ainimation.editor.v1` envelope (`kind`, `plan`) as `editorProject` to `/stock/publish`, together with the rendered WebM or interactive HTML. `externalRef` identifies the immediate parent. The Stock service validates that parent, writes a new asset and immutable source, and returns `editorProjectUrl`, `versionRoot`, `id` and the index receipt. The editable source is separate from the catalogue index. Matching rendered bytes must not collapse distinct editable versions or steal the original asset's hash mapping.

Only after successful confirmation does the editor return to `?highlight=<new-id>&origen=<root-id>`. On error the editor and local project remain available. If further edits occurred during upload, the editor displays a link to the saved revision and preserves the newer work.

Director preserves the previous workspace in `ainimation:before-admira-edit`. On reopen, query parameters are removed after the source is saved locally, so reload does not discard subsequent edits. Structured interactives open as a new local library entry and preserve existing projects. Blob media is embedded into a portable source; the source has a 24 MiB limit.

Older rendered videos open as a new single-media composition. Older HTML interactives without editable source cannot reconstruct their original layers or behaviours; the editor explains that their original project must be imported. New interactive publications retain both their HTML and their editable source.

Release order: deploy the Stock service from the matching pixer-worker change, publish this editor, then merge the Pixeria catalogue change and regenerate admira.studio through its existing mirror process. Do not edit the generated mirror manually. No migration or replacement of existing assets is required.

Validation includes the Stock handler with an in-memory R2 bucket, editor source and return-link tests, catalogue descendant/link tests in ES and EN, and a Chrome headless check editing and publishing a video and structured interactive before returning to the catalogue.

## Release checklist — 24 October 2026

Coordinated changes: Stock [#48](https://github.com/csilvasantin/pixer-worker/pull/48), editor [#73](https://github.com/csilvasantin/ainimation/pull/73), catalogue [#125](https://github.com/csilvasantin/pixeria/pull/125). Preparing these branches does not deploy production.

1. Merge and deploy Stock first through its configured Worker deployment. Confirm the deployed revision contains the editor-project endpoint: a nonexistent ID should return `404` with `editor-project-not-found` and the expected AInimation CORS header, rather than a generic route error.
2. Merge AInimation, wait for the asset stamp and hosting deployment, and verify the production editor revision. A preview deployment alone does not confirm production readiness.
3. Merge Pixeria and follow its existing `deploy.sh` process from clean, updated `main`, declaring the responsible agent and physical machine as required by the script.
4. Regenerate Admira Studio through `sync.sh --aplicar` from Pixeria `origin/main`, review and commit the generated changes, then publish through Studio's `deploy.sh`. Verify `.fuente` identifies the Pixeria commit containing #125. Do not mirror an unmerged feature branch or change generated HTML by hand.
5. In headless Chrome, edit disposable video and structured interactive pieces on the production domains. Confirm a distinct child ID, immediate parent and root, retrievable editable source, highlighted catalogue return, and reopening with edits intact. Confirm the original still opens. Remove disposable pieces through the authenticated Stock deletion route.

Stop before enabling the next component if its dependency check fails. Production save/delete verification writes data and belongs to the publication phase; preparation uses intercepted requests and in-memory R2.

For rollback, restore the previous catalogue and generated Studio deployment first, then the previous editor. Keep the newer Stock service available while any deployed editor still sends editable projects. Sources are additive: do not delete source objects or rewrite asset metadata during rollback. Reverting the UI does not remove versions already saved by users.

Deleting a version must forget a rendered-content hash only when that version owns its mapping. Stock tests cover preservation of another piece's hash mapping and deletion of the version's editable source.
