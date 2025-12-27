import Agenda from "agenda"
import { SwiftTvFileCheck } from "../controllers/checkEPGFiles.js";

export let agenda;

export const connectAgenda = async () => {
  try {
    agenda = new Agenda({
      db: { address: process.env.MONGO_URI },
    });

    // agenda started
    await agenda.start();
    console.log("Agenda Started");

    // agenda jobs
    agenda.define('epg-check', async job => {
      const { channel } = job.attrs.data;
      // check and update swiftTv file
      SwiftTvFileCheck(channel);

      // check and update yupptv file

    });

  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    process.exit(1);
  }
};
