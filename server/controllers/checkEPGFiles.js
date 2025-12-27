import fs from 'fs';
import path from 'path';
import XLSX from "xlsx";
import Channel from '../models/channelModel.js';
import { addOneDayToDates, findLastDateFromExcel } from '../utils/Other.js';
import { SaveExcelFile } from '../utils/save/SaveFile.js';
import EpgFiles from '../models/epgFilesModel.js';
import { convertToDistro, convertToSwift, convertToYupp } from './epgController.js';
import { agenda } from '../config/agenda.js';


export default async function checkEPGFiles(req, res) {
    const userId = '6943d6a9df2c2a43946b1121';

    // await agenda.now("epg-check", { channel:'693a4f55663f179ae1f2806d' });
    const response = await SwiftTvFileCheck(userId);

    res.json(response);
}


export const SwiftTvFileCheck = async (userId) => {

    const EpgFileData = await EpgFiles.findOne({ channel: userId }).sort({ createdAt: -1 }).populate('channel');

    const channelName = EpgFileData?.channel?.name?.replace(/ /g, "_");

    const channelId = EpgFileData?.channel?._id;

    const fileDir = path.join(process.cwd(), "public", channelName, EpgFileData?.filename);

    if (!fs.existsSync(fileDir)) {
        console.log('file not found', fileDir) // save logs later
        return
    };

    if (!channelId || !channelName) {
        console.log('channel not found') // save logs later
        return
    }

    if (!EpgFileData) {
        console.log('EPG File not found') // save logs later
        return
    }


    // Read workbook using buffer (safe for ESM)
    const fileBuffer = fs.readFileSync(fileDir);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, cellText: true });

    const addedDateData = addOneDayToDates(jsonData);

    // addedDateData + jsonData
    const updatedJsonData = [...jsonData, ...addedDateData];

    // get last datetime obj for schedule job 
    const IST_OFFSET = "+05:30";
    const lastDateTime = updatedJsonData.reduce((latest, item) => {
        const current = new Date(`${item.Date}T${item.start}${IST_OFFSET}`);
        return current > latest ? current : latest;
    }, new Date(`${updatedJsonData[0].Date}T${updatedJsonData[0].start}${IST_OFFSET}`));

    // ------- schedeule new job
    await agenda.cancel({ name: "epg-check", "data.channel": channelId });
    const runAt = new Date(lastDateTime);
    await agenda.schedule(runAt, "epg-check", {
        channel: channelId,
    });

    // -------------------------------
    // CREATE NEW EXCEL FILE
    // -------------------------------
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(updatedJsonData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");

    // Output directory
    const outputDir = path.join(process.cwd(), "public", channelName);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Output file path
    const ext = path.extname(EpgFileData?.filename);

    const fileOriginalName = `${channelName}_auto`

    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;

    const outputFileName = `${fileOriginalName}_${formattedDate}${ext}`;
    const outputPath = path.join(outputDir, outputFileName);

    // Optional: delete existing file first (not required)
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    // Write new Excel file (will overwrite if exists)
    XLSX.writeFile(newWorkbook, outputPath);


    // Save into DB
    const epgFile = new EpgFiles({
        filename: outputFileName,
        channel: channelId
    });

    await epgFile.save();

    convertToSwift(outputFileName);
    convertToYupp(outputFileName);
    convertToDistro(outputFileName);

    return updatedJsonData;


}