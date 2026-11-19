import { businessErrorResponse, businessResponse, businessTokenHash, readBusinessBody } from "@/lib/business/gateway";

export async function POST(request: Request) {
  try {
    const hash = businessTokenHash(request);
    return businessResponse(hash, await readBusinessBody(request));
  } catch (error) {
    return businessErrorResponse(error);
  }
}
