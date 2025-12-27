import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import EpgFiles from "../models/epgFilesModel.js";
import { deleteFile } from "../config/multer.js";
import { buildEPGXML, formatProgramDuration, swiftFormatDate, yuppFormatDate } from "../utils/Other.js";
import { agenda } from "../config/agenda.js";


export const UploadEPGFile = async (req, res, next) => {
    try {
        if (req?.files?.epgfile[0]?.filename) {

            const filename = req?.files.epgfile[0]?.filename
            const channel = req?.body?.channel;
            const epgCheck = req?.body?.epgCheck;

            if (!channel) {
                return res.status(400).json({ message: "Channel id is required" });
            }

            // remove old job
            if (new Date(epgCheck) > new Date()) {
                console.log('Next job will run by ', new Date(epgCheck).toLocaleString());
                await agenda.cancel({ name: "epg-check", "data.channel": channel });
                await agenda.schedule(new Date(epgCheck), "epg-check", {
                    channel,
                });
            }

            const epgFile = new EpgFiles({ filename, channel });

            await epgFile.save();

            res.status(200).json({
                success: true,
                message: "File uploaded successfully",
                data: epgFile
            });

            let fileName = filename

            convertToSwift(fileName);
            convertToYupp(fileName);
            convertToDistro(fileName);
        } else {
            res.status(403).json({ success: false, message: "File Not Uploaded" });
        }
    } catch (err) {
        next(err);
    }
};

export const AllEpgFiles = async (req, res, next) => {
    try {
        const userId = req?.user?._id;
        const filter = req?.user?.role !== "admin" ? { author: userId } : {};

        const epgFiles = await EpgFiles.find(filter).populate('author').populate('channel').sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: epgFiles,
        });

    } catch (err) {
        next(err)
    }
};

export const DeleteEpgFiles = async (req, res, next) => {
    try {
        const id = req.params.id;

        const epgFile = await EpgFiles.findById(id).populate('channel');
        if (!epgFile) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        // delete file from disk
        if (epgFile?.channel) {
            deleteFile(epgFile?.channel?.name, epgFile.filename);
        }

        // delete from DB
        await EpgFiles.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "File deleted successfully",
        });

    } catch (err) {
        next(err);
    }
};


export const convertToSwift = async (fileName) => {
    try {

        const EPGFileData = await EpgFiles.findOne({ filename: fileName }).populate('channel');

        const username = EPGFileData?.channel?.name?.replace(/ /g, "_");
        const channeltype = EPGFileData?.channel?.type;
        const langMap = {
            en: "english",
            hi: "hindi",
            bn: "bengali",
            ta: "tamil",
            te: "telugu"
        };

        const channellang = langMap[EPGFileData?.channel?.lang] || "unknown";
        // Full path of uploaded Excel file
        const filePath = path.join(process.cwd(), "public", username, fileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

        // Read workbook using buffer (safe for ESM)
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, cellText: true });

        const SwiftJsonData = jsonData.map(item => ({
            Date: swiftFormatDate(item?.Date),
            "PROGRAMME START": item["start"],
            "PROGRAMME NAME": item["title"],
            SYNOPSIS: item["desc"],
            "Progam poster 1 (in url ) 16:9": "",
            "Program poster 2 (in base64 or url) 1:1.5": "",
            "Program Tags": `{"${channeltype}","${channellang}","${channeltype}"}`
        }));

        // -------------------------------
        // CREATE NEW EXCEL FILE
        // -------------------------------
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.json_to_sheet(SwiftJsonData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");

        // Output directory
        const outputDir = path.join(process.cwd(), "public", "output", username);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Output file path
        const outputFileName = "SwiftTv.xlsx";
        const outputPath = path.join(outputDir, outputFileName);

        // Optional: delete existing file first (not required)
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        // Write new Excel file (will overwrite if exists)
        XLSX.writeFile(newWorkbook, outputPath);

    } catch (err) {
        console.log(err)
    }
};

export const convertToYupp = async (fileName) => {
    try {

        const EPGFileData = await EpgFiles.findOne({ filename: fileName }).populate('channel');

        const username = EPGFileData?.channel?.name?.replace(/ /g, "_");

        const channeltype = EPGFileData?.channel?.type;


        // Full path of uploaded Excel file
        const filePath = path.join(process.cwd(), "public", username, fileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

        // Read workbook using buffer (safe for ESM)
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, cellText: true });

        const SwiftJsonData = jsonData.map(item => ({
            "Channel Name": item["channel"],
            "Schedule Airing Date": yuppFormatDate(item?.Date),
            "Airing Start Time": item["start"],
            "End Time": item["stop"],
            "Program Duration": formatProgramDuration(item["start"], item["stop"]),
            "Genre": item["Genre"] || 'News',
            "Sub Genre": "",
            "Program Name": item["title"],
            "Episodic Synopsis": item["desc"],
            "Original/Repeat": "Original",
            "Rating": "",
            "Live/ Recorded": "",
            "Original Program Language": item["lang"],
            "Dubbed Language": "NA",
            "Episode Number": "NA",
            "Episode Title": "NA",
            "Season Number": "NA",
            "Season Name": "NA",
            "Star Cast (Comma separated value)": "NA",
            "Director (Comma separated value)": "NA",
            "Producer (Comma separated value)": "NA",
            "Year of release": "NA",
            "Censor/Broadcast Ratings": "NA",
            "Episode Short Title": "NA",
            "Generic Synopsis": channeltype,
        }));


        // -------------------------------
        // CREATE NEW EXCEL FILE
        // -------------------------------
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.json_to_sheet(SwiftJsonData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");

        // Output directory
        const outputDir = path.join(process.cwd(), "public", "output", username);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Output file path
        const outputFileName = "YuppTv.xlsx";
        const outputPath = path.join(outputDir, outputFileName);

        // Optional: delete existing file first (not required)
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        // Write new Excel file (will overwrite if exists)
        XLSX.writeFile(newWorkbook, outputPath);

        // return res.status(200).json({
        //     success: true,
        //     message: "Swift Excel created successfully",
        //     file: outputFileName,
        //     path: `/public/output/${username}/${outputFileName}`
        // });

    } catch (err) {
        console.log(err);
    }
};

export const convertToDistro = async (fileName) => {
    try {
        const EPGFileData = await EpgFiles.findOne({ filename: fileName }).populate('channel');
        const username = EPGFileData?.channel?.name?.replace(/ /g, "_");

        // Full path of uploaded Excel file
        const filePath = path.join(process.cwd(), "public", username, fileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

        // Read workbook using buffer (safe for ESM)
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, cellText: true });

        const xmlOutput = buildEPGXML(jsonData);

        // Directory where XML will be saved
        const xmlDir = path.join(process.cwd(), "public", "output", username);

        // Create directory if not exists
        if (!fs.existsSync(xmlDir)) {
            fs.mkdirSync(xmlDir, { recursive: true });
        }

        // XML output file name (same as Excel but .xml)
        const xmlFileName = fileName.replace(path.extname(fileName), ".xml");

        // Full path of XML file
        const xmlFilePath = path.join(xmlDir, "DistroTv.xml");

        // Save XML file
        fs.writeFileSync(xmlFilePath, xmlOutput, "utf8");

        // return res.status(200).json({
        //     success: true,
        //     message: "Swift Excel created successfully",
        //     file: xmlFileName,
        // });

    } catch (err) {
        console.log(err)
    }
};