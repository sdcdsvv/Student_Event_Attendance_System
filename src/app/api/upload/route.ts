import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise<Response>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'student information system' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            resolve(new Response(JSON.stringify({ error: error.message }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }));
          } else {
            resolve(new Response(JSON.stringify({ 
              secure_url: result?.secure_url,
              public_id: result?.public_id
            }), { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
        }
      );
      
      uploadStream.end(buffer);
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
