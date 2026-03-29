import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Secure document download endpoint.
 *
 * 1. Authenticates the user via session cookie.
 * 2. Fetches the document record.
 * 3. Checks the user can view the event (via RLS on event_documents).
 * 4. Generates a short-lived signed URL from Supabase Storage.
 * 5. Redirects to the signed URL.
 *
 * Never exposes raw storage paths directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the session client to fetch the document — RLS enforces visibility.
  // If the user can't see this document, the query returns nothing.
  const { data: doc } = await supabase
    .from("event_documents")
    .select("id, file_path, name, file_type")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found or access denied" },
      { status: 404 }
    );
  }

  // Generate a short-lived signed URL using the service client
  // (the session client may not have storage access)
  const serviceClient = await createServiceClient();
  const { data: signedUrl, error: signError } = await serviceClient.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 60); // 60 seconds

  if (signError || !signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}
