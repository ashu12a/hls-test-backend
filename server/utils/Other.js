import jwt from 'jsonwebtoken';
import User from "../models/userModel.js";

export const decodeJwtToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  return user || null;
}

export const swiftFormatDate = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
};

export const yuppFormatDate = (isoDate) => {
  if (!isoDate) return "";
  // Create a Date object
  const dateObj = new Date(isoDate);

  // Format the date
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('en-US', options);

  return formattedDate;
};

export const formatXMLDateDistro = (dateString, timeString) => {
  const dt = new Date(`${dateString} ${timeString}`);
  const pad = (n) => n.toString().padStart(2, "0");

  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const HH = pad(dt.getHours());
  const MM = pad(dt.getMinutes());
  const SS = pad(dt.getSeconds());

  return `${yyyy}${mm}${dd}${HH}${MM}${SS} +0530`;
};

export const formatProgramDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "";

  // Convert times to Date objects using a dummy date
  let start = new Date(`1970-01-01T${startTime}Z`);
  let end = new Date(`1970-01-01T${endTime}Z`);

  // If end is before start, add 24 hours (crossing midnight)
  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  // Calculate duration in milliseconds
  const durationMs = end - start;

  // Convert to hours and minutes
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format nicely
  let result = "";
  if (hours > 0) result += `${hours} hr${hours > 1 ? "s." : "."}`;
  if (minutes > 0) result += hours > 0 ? ` ${minutes} Min.` : `${minutes} Min.`;

  return result || "0 Min.";
};

export const buildEPGXML = (jsonData) => {
  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<tv>\n`;

  // Channel block
  xml += `  <channel id="${jsonData[0]?.id}">\n`;
  xml += `    <display-name>${jsonData[0]['display-name']}</display-name>\n`;
  xml += `  </channel>\n`;

  // Programme blocks
  jsonData.forEach((p) => {
    xml += `  <programme channel="${jsonData[0]['display-name']}" start="${formatXMLDateDistro(p.Date, p.start)}" stop="${formatXMLDateDistro(p.Date, p.stop)}">\n`;
    xml += `    <title lang="TM">${p.title}</title>\n`;
    xml += `    <desc lang="TM">${p.desc}</desc>\n`;
    xml += `    <icon></icon>\n`;
    xml += `    <rating system="${p.system}">\n`;
    xml += `      <value />\n`;
    xml += `    </rating>\n`;
    xml += `  </programme>\n`;
  });

  xml += `</tv>`;
  return xml;
};

export const findLastDateFromExcel = (jsonData) => {
  if (!jsonData || !jsonData.length) return null;

  const lastObj = jsonData[jsonData?.length - 1];

  const lastDate = lastObj?.Date;

  return lastDate

};

export const addOneDayToDates = (data) => {
  if (!Array.isArray(data)) return [];

  const lastObj = data[data?.length - 1];
  const lastDate = lastObj?.Date;

  let count;
  let newDate = new Date(lastDate);
  const updatedData = data.map((item, index) => {

    if (count !== item?.Date) {
      count = item?.Date;
      newDate.setDate(newDate.getDate() + 1); // ✅ add 1 day safely
    }

    return {
      ...item,
      Date: newDate.toISOString().split("T")[0],
    };
  });

  return updatedData;
};
