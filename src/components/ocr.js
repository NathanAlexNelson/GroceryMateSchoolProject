import Tesseract from "tesseract.js";

export const runOCR = async (file, onProgress) => {
  const { data: { text } } = await Tesseract.recognize(
    file,
    "eng",
    {
      // workerPath: "/tesseract/worker.min.js",
      // langPath: "/tesseract",
      // corePath: "/tesseract", // optional but safer offline
      logger: (m) => onProgress && onProgress(m),
    }
  );

  return text;
};