# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.4.x | Yes |
| Earlier versions | No |

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/YazeKT/Nestform/security/advisories/new). Include the affected version, impact, reproduction steps, and any suggested mitigation. Do not attach confidential client drawings or publish an exploit in an issue.

If private reporting is unavailable, email [kirstentrimaley@gmail.com](mailto:kirstentrimaley@gmail.com) with the subject `Nestform security report`. Do not send executable attachments unless requested.

You should receive an acknowledgement within five business days. The maintainer will validate the report, agree on disclosure timing, prepare a fix and affected-version statement, and credit the reporter if requested and appropriate.

## Scope

Security reports include arbitrary file access, unsafe IPC, renderer-to-main privilege escalation, SVG sanitization bypass, native crashes with security impact, path traversal, history-backup escape, and release-supply-chain compromise. General crashes, nesting quality, and conversion-service availability belong in normal issue templates unless they cross a security boundary.

