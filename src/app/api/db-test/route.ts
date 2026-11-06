import {
  testDatabaseConnection,
  createGameDocument,
} from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const result = await testDatabaseConnection();

    return Response.json({
      message: "UNAMpire database connected successfully!",
      ...result,
    });
  } catch (error) {
    console.error("Firebase connection error:", error);

    return Response.json(
      { connected: false, error: "Database connection failed. Check the terminal." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const body = await request.json();

    await createGameDocument("unampire-test", {
      project: "UNAMpire",
      test: true,
      ...body,
    });

    return Response.json({ saved: true, message: "Test game saved!" });
  } catch (error) {
    console.error("Firebase save error:", error);

    return Response.json(
      { saved: false, error: "Could not save the test game." },
      { status: 500 }
    );
  }
}