import fs from 'fs';
import path from 'path';
import XLSX from "xlsx";

export const SaveExcelFile = (data, channel, outputFileName) => {
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");

    // Output directory
    const outputDir = path.join(process.cwd(), "public", "output", channel);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, outputFileName);

    // Optional: delete existing file first (not required)
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    // Write new Excel file (will overwrite if exists)
    XLSX.writeFile(newWorkbook, outputPath);

}