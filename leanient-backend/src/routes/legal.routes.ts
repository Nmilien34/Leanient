import path from "path";
import express, { type Request, type Response, type Router } from "express";

/**
 * Static legal pages (Privacy Policy + Terms of Use) served straight from the
 * API host so the App Store has live URLs to open during subscription review
 * (App Store guideline 3.1.2). The HTML lives in `leanient-backend/public/` and
 * ships with the service on Render. Mounted before helmet so the pages' inline
 * <style> blocks aren't stripped by the default Content-Security-Policy.
 */
const LEGAL_DIR = path.resolve(process.cwd(), "public");

export function createLegalRouter(): Router {
  const router = express.Router();
  const sendPage = (file: string) => (_req: Request, res: Response) => {
    res.type("html").sendFile(path.join(LEGAL_DIR, file));
  };
  router.get("/privacy", sendPage("privacy.html"));
  router.get("/terms", sendPage("terms.html"));
  return router;
}
