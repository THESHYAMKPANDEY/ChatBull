import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import { logger } from '../utils/logger';

const router = Router();

router.get('/p/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('author', 'displayName username');

    if (!post) {
      return res.status(404).send('<h1>Post not found</h1>');
    }

    const authorName = (post.author as any)?.displayName || 'ChatBull User';
    const authorHandle = (post.author as any)?.username ? `@${(post.author as any).username}` : '';
    const content = post.content || 'Check out this post on ChatBull';
    const mediaUrl = post.mediaUrl || 'https://chatbull.com/assets/logo.png'; // Fallback image
    const isVideo = post.mediaType === 'video';

    // HTML Template with Open Graph Tags
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post by ${authorName} | ChatBull</title>
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${process.env.API_URL || 'https://chatbull-backend.onrender.com'}/share/p/${id}">
        <meta property="og:title" content="Post by ${authorName} ${authorHandle}">
        <meta property="og:description" content="${content.substring(0, 150)}...">
        <meta property="og:image" content="${mediaUrl}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${process.env.API_URL || 'https://chatbull-backend.onrender.com'}/share/p/${id}">
        <meta property="twitter:title" content="Post by ${authorName}">
        <meta property="twitter:description" content="${content.substring(0, 150)}...">
        <meta property="twitter:image" content="${mediaUrl}">

        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; width: 100%; overflow: hidden; }
          .header { padding: 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; }
          .avatar { width: 40px; height: 40px; background: #ddd; border-radius: 50%; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #555; }
          .name { font-weight: 600; color: #1c1e21; }
          .username { color: #65676b; font-size: 0.9em; margin-left: 5px; }
          .media { width: 100%; background: #000; display: flex; justify-content: center; }
          .media img, .media video { max-width: 100%; max-height: 500px; object-fit: contain; }
          .content { padding: 15px; color: #1c1e21; line-height: 1.5; }
          .footer { padding: 15px; border-top: 1px solid #eee; text-align: center; background: #f9f9f9; }
          .btn { background: #0084ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-weight: 600; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="avatar">${authorName.charAt(0)}</div>
            <div>
              <span class="name">${authorName}</span>
              <span class="username">${authorHandle}</span>
            </div>
          </div>
          ${mediaUrl ? `
            <div class="media">
              ${isVideo 
                ? `<video controls poster="${mediaUrl.replace(/\.[^/.]+$/, ".jpg")}" src="${mediaUrl}"></video>`
                : `<img src="${mediaUrl}" alt="Post media" />`
              }
            </div>
          ` : ''}
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <a href="chatbull://" class="btn">Open in ChatBull</a>
            <p style="margin-top: 10px; color: #65676b; font-size: 0.8em;">Don't have the app? <a href="#" style="color: #0084ff;">Download now</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error: any) {
    logger.error('Share page error', { message: error.message });
    res.status(500).send('Error loading post');
  }
});

export default router;
