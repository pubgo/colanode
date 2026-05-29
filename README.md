<div align="center">
<img alt="Colanode cover" src="assets/images/colanode-github-cover.jpg">
<p></p>
<a target="_blank" href="https://opensource.org/licenses/Apache-2.0" style="background:none">
    <img src="https://img.shields.io/badge/Licene-Apache_2.0-blue" style="height: 22px;" />
</a>
<a target="_blank" href="https://discord.gg/ZsnDwW3289" style="background:none">
    <img alt="" src="https://img.shields.io/badge/Discord-Colanode-%235865F2" style="height: 22px;" />
</a>
<a href="https://x.com/colanode" target="_blank">
  <img alt="" src="https://img.shields.io/twitter/follow/colanode.svg?style=social&label=Follow" style="height: 22px;" />
</a>
</div>

# Colanode

### Open-source & local-first collaboration workspace for desktop and web

Colanode is an all-in-one platform for easy collaboration, built to prioritize your data privacy and control. Designed with a **local-first** approach, it helps teams communicate, organize, and manage projects—whether online or offline. With Colanode, you get the flexibility of modern collaboration tools, plus the peace of mind that comes from owning your data.

### What can you do with Colanode?

- **Real-Time Chat:** Stay connected with instant messaging for teams and individuals.
- **Rich Text Pages:** Create documents, wikis, and notes using an intuitive editor, similar to Notion.
- **Customizable Databases:** Organize information with structured data, custom fields and dynamic views (table, kanban, calendar).
- **File Management:** Store, share, and manage files effortlessly within secure workspaces.

Built for both individuals and teams, Colanode adapts to your needs, whether you're running a small project, managing a team, or collaborating across an entire organization. With its self-hosted model, you retain full control over your data while enjoying a polished, feature-rich experience.

![Colanode preview](assets/images/colanode-desktop-preview.gif)

## How it works

This branch focuses on a local-first client workflow. Data is stored on-device and used directly by the desktop/web clients so you can collaborate locally without requiring a remote server runtime.

### Local-first workflow

All changes you make are saved to a local SQLite database first. Reads also happen locally, ensuring immediate access to any content you have permissions to view and smooth offline usage.

### Concurrent edits

Colanode relies on **Conflict-free Replicated Data Types (CRDTs)** - powered by [Yjs](https://docs.yjs.dev/) - to allow real-time collaboration on entries like pages or database records. This means multiple people can edit at the same time, and the system gracefully merges everyone's updates. Deletions are also tracked as specialized transactions. Messages and file operations don't support concurrent edits and use simpler database tables.

## Running locally

To run Colanode locally in development mode:

1. Clone the repository:

   ```bash
   git clone https://github.com/colanode/colanode.git
   cd colanode
   ```

2. Install dependencies at the project root:

   ```bash
   npm install
   ```

3. Start the apps you want to run locally:

   **Web**

   ```bash
   cd apps/web
   npm run dev
   ```

   **Desktop**

   ```bash
   cd apps/desktop
   npm run dev
   ```

   To store desktop local data (SQLite databases, workspace files, images, etc.)
   in a custom directory, set `COLANODE_STORAGE_DIR` before starting the app:

   ```bash
   COLANODE_STORAGE_DIR=/absolute/path/to/your/local-repo npm run dev --workspace @colanode/desktop
   ```

   You can also pass a CLI flag:

   ```bash
   npm run dev --workspace @colanode/desktop -- --colanode-storage-dir=/absolute/path/to/your/local-repo
   ```

## Testing

Colanode includes tests for web.

### Web tests

From `apps/web`:

```bash
npm run test
```

## License

Colanode is released under the [Apache 2.0 License](LICENSE).
