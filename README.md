# VMBS Power Pages

Source for the VMBSO customer portal, a Power Pages Code Site (React + TypeScript + Vite).

## Repository layout

| Path | Contents |
| --- | --- |
| [`vmbso-spa-v2/`](vmbso-spa-v2/) | The portal app: source, build config and the deploy/sync scripts. **Start here.** |
| [`vmbso-spa-v2/README.md`](vmbso-spa-v2/README.md) | Development setup, npm scripts, prerequisites, and the DEV → TEST → PROD deployment process. |
| [`docs/`](docs/) | Specs, Dataverse schema, FetchXML queries, flow requirements and troubleshooting notes. |

## Quick start

```bash
cd vmbso-spa-v2
npm install
npm run dev
```

For prerequisites (PAC CLI, Azure CLI), `.env.local` and how deployments work, see
[`vmbso-spa-v2/README.md`](vmbso-spa-v2/README.md).
