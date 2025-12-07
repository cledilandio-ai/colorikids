import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase client will be initialized inside the handler to allow build without env vars
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
// const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase configuration");
            // If env vars are missing, we return a server error, but build succeeds
            return NextResponse.json(
                { error: "Server configuration error: Missing Supabase credentials." },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file received." },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const filename = Date.now() + "_" + file.name.replaceAll(" ", "_");

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from("uploads")
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error("Supabase storage error:", error);
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from("uploads")
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Error uploading file" },
            { status: 500 }
        );
    }
}
