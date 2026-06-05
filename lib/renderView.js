const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const viewsRoot = path.join(process.cwd(), 'views');
const compiledTemplates = new Map();

const ejsOpts = {
  root: viewsRoot,
  views: [viewsRoot, path.join(viewsRoot, 'partials')],
  async: false,
};

function getCompiledTemplate(viewName) {
  const file = path.join(viewsRoot, `${viewName}.ejs`);
  let mtime = 0;
  try {
    mtime = fs.statSync(file).mtimeMs;
  } catch {
    return null;
  }
  const cached = compiledTemplates.get(file);
  if (cached && cached.mtime === mtime) return cached.render;

  const template = ejs.compile(fs.readFileSync(file, 'utf8'), {
    ...ejsOpts,
    filename: file,
  });
  compiledTemplates.set(file, { mtime, render: template });
  return template;
}

function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : html;
}

/** Split admin layout: sidebar (fixed) + main (swapped on client nav). */
function splitAdminShell(bodyHtml) {
  const match = bodyHtml.match(
    /(<aside\b[^>]*\bclass="sidebar"[\s\S]*?<\/aside>)/i
  );
  if (!match) {
    return { sidebarHtml: '', mainHtml: bodyHtml };
  }
  return {
    sidebarHtml: match[1],
    mainHtml: bodyHtml.replace(match[1], '').trim(),
  };
}

async function renderView(viewName, data = {}) {
  const compiled = getCompiledTemplate(viewName);
  if (compiled) return compiled(data);
  const file = path.join(viewsRoot, `${viewName}.ejs`);
  return ejs.renderFile(file, data, ejsOpts);
}

async function renderBody(viewName, data = {}) {
  const html = await renderView(viewName, data);
  return extractBody(html);
}

/** Body HTML + script payloads for Next.js (innerHTML does not run scripts) */
async function renderPageForNext(viewName, data = {}) {
  const body = await renderBody(viewName, data);
  const inline = [];
  const external = [];
  const bodyHtml = body
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, content) => {
      const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch) {
        external.push(srcMatch[1]);
      } else if (content.trim()) {
        inline.push(content.trim());
      }
      return '';
    })
    .trim();
  const seen = new Set();
  const scriptSrcs = external.filter((src) => {
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
  return { bodyHtml, inlineScripts: inline.join('\n'), scriptSrcs };
}

async function renderAdminPageForNext(viewName, data = {}) {
  const rendered = await renderPageForNext(viewName, data);
  const { sidebarHtml, mainHtml } = splitAdminShell(rendered.bodyHtml);
  return { ...rendered, sidebarHtml, mainHtml };
}

module.exports = {
  renderView,
  renderBody,
  extractBody,
  splitAdminShell,
  renderPageForNext,
  renderAdminPageForNext,
};
