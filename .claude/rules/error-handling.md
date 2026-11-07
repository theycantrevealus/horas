# Error Handling

- Distinguish validation errors, business rejections, transient infrastructure failures, and unexpected defects.
- Preserve useful error context when propagating errors.
- Do not expose stack traces, secrets, SQL details, any queries, or internal infrastructure information in public responses.
- Do not silently swallow errors.
- Avoid returning success when a required operation has failed.
