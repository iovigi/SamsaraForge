import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file uploaded' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const originalName = file.name;
        const ext = path.extname(originalName);
        const fileName = `${uuidv4()}${ext}`;

        // Ensure upload dir exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // Return the URL relative to the public folder (or served via static file serving)
        // CAUTION: In production with Next.js specific setup, serving 'public' might need config.
        // For now we assume standard static hosting or configuring the /uploads route.
        const fileUrl = `/uploads/${fileName}`;

        return NextResponse.json({
            success: true,
            url: fileUrl,
            originalName: originalName,
            type: file.type
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: 'Upload failed' },
            { status: 500 }
        );
    }
}
