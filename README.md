# 📊 Relationing Schema Maker

> A premium, interactive database schema designer built with Vanilla JavaScript, HTML5, and SVG. Drag-and-drop tables, define fields, map relationships visually, and export your diagrams in seconds.

---

## ✨ Features

- **🗂️ Interactive Table Builder**: Add database tables, define column names, primary keys, and data types with a simple, clean UI.
- **🔗 Visual Relationships**: Draw lines between tables with custom SVG-rendered connector lines and directional arrowheads to model primary/foreign key connections.
- **🖼️ Export to PNG**: Render and download your entire relational schema diagram as a high-quality PNG image (powered by `html2canvas`).
- **💾 Save & Load Workspaces**: 
  - Save your active schema configurations as `.json` files.
  - Import previously saved workspace `.json` files to instantly resume designing.
- **⚡ Lightweight & Offline-First**: Built completely using vanilla frontend technologies. No installation or heavy bundle sizes—works directly in the browser!

---

## 🛠️ Tech Stack

- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Graphics**: SVG (Scalable Vector Graphics) for dynamic relation line rendering
- **Image Generation**: [html2canvas](https://html2canvas.hertzen.com/) (loaded via CDN)

---

## 📂 Project Structure

```text
relation_schema_maker/
├── index.html        # Main app UI structure and SVG rendering canvas
├── css/
│   └── style.css     # Canvas positioning, table styling, and interactive layout
└── js/
    ├── app.js        # Core canvas handling, table creation, relationships, and exports
    └── router.js     # Workspace state persistence & internal app logic
```

---

## 🚀 Getting Started

### Local Setup
Since Relationing Schema Maker is a static web application, there are **no build steps or dependencies to install**. You can run it directly in your browser.

1. **Clone the repository**:
   ```bash
   git clone git@github.com:Exactly15/relation-schema-maker.git
   cd relation-schema-maker
   ```

2. **Run it locally**:
   - Double-click `index.html` to open it in your browser.
   - Or, run a simple local server in the folder:
     ```bash
     python3 -m http.server 8000
     ```
     Then navigate to `http://localhost:8000`.
