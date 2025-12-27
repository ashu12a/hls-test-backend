


import multer from "multer";
import path from "path";
import fs from "fs"; // Import fs module to check and create directories

// Multer setup to store files in the 'public' directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body?.channelname?.replace(/ /g, "_") || "epgFiles";

    // Set the default directory for storing uploads
    const publicDir = path.join(process.cwd(), "public", folder); // Use process.cwd() for ES Modules

    // Create the public directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    cb(null, publicDir); // Save to the public folder

  },

  
  filename: function (req, file, cb) {
    try {
      const ext = path.extname(file.originalname);

      const fileOriginalName = file.originalname
        .replace(/\s+/g, "_")
        .replace(ext, "");

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;

      const finalName = `${fileOriginalName}_${formattedDate}${ext}`;

      cb(null, finalName);
    } catch (err) {
      cb(err, null);
    }
  },
});

// Export multer with the defined storage settings
export const upload = multer({ storage: storage });

export const uploadEPG = upload.fields([
  { name: "epgfile", maxCount: 1 },
]);

export const deleteFile = (username, filename) => {
  const safeName = username.replace(/ /g, "_");

  const filePath = path.join(process.cwd(), "public", safeName, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  } else {
    return false;
  }
};