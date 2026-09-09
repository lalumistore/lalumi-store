import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";

export default function ExportButtons({ rows, columns, filename, title }) {
  const exportXLSX = () => {
    const data = rows.map((r, i) => {
      const obj = {};
      columns.forEach((c) => (obj[c.label] = c.value(r, i)));
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportPDF = () => {
    const headerRow = columns.map((c) => `<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #1FB6BA;font-size:13px;">${c.label}</th>`).join("");
    const bodyRows = rows
      .map((r, i) => `<tr>${columns.map((c) => `<td style="padding:7px 12px;border-bottom:1px solid #EFEADC;font-size:13px;">${c.value(r, i)}</td>`).join("")}</tr>`)
      .join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1E3A3A;padding:24px;}
        h1{color:#0E8A8E;font-size:20px;margin-bottom:4px;}
        p{color:#6B7A7A;font-size:12px;margin-top:0;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        button{background:#EC4899;color:#fff;border:none;border-radius:999px;padding:10px 20px;font-weight:bold;font-size:14px;cursor:pointer;margin-bottom:12px;}
        @media print{ button{ display:none; } }
      </style></head>
      <body>
        <button onclick="window.print()">Imprimir / salvar como PDF</button>
        <h1>${title}</h1>
        <p>Lalumi Store — gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 mb-3 no-print">
      <button onClick={exportXLSX} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "#E9F5DD", color: "#5C7A2B" }}>
        <FileSpreadsheet size={14} /> Exportar XLSX
      </button>
      <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "#FBEAF0", color: "#993556" }}>
        <FileText size={14} /> Exportar PDF
      </button>
    </div>
  );
}
