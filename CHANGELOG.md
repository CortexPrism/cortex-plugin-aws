# Changelog

## [Unreleased]

### Added
- Structured logging via ctx.logger in lifecycle hooks

### Changed
- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added
- Initial release
## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-aws
- `aws_list_resources` — List resources by service
- `aws_describe` — Describe a resource
- `aws_get_logs` — Get CloudWatch logs
- `aws_list_buckets` — List S3 buckets
- `aws_invoke_lambda` — Invoke Lambda function
- `aws_cost_estimate` — Estimate monthly cost
