API Reference
The Upload-Post API provides comprehensive endpoints for content management across multiple social media platforms. All endpoints require authentication via API key in the Authorization header.

Core Upload APIs
Video Upload API
Upload videos to TikTok, Instagram, LinkedIn, YouTube, Facebook, X (Twitter), Threads, and Pinterest. Supports both synchronous and asynchronous uploads with scheduling capabilities.

Endpoint: POST /api/upload_videos

Supported Platforms: TikTok, Instagram, LinkedIn, YouTube, Facebook, X (Twitter), Threads, Pinterest

Photo Upload API
Upload photos and image carousels to LinkedIn, Facebook, X (Twitter), Instagram, TikTok, Threads, and Pinterest. Perfect for visual content distribution across platforms.

Endpoint: POST /api/upload_photos

Supported Platforms: LinkedIn, Facebook, X (Twitter), Instagram, TikTok, Threads, Pinterest

Text Upload API
Create and distribute text-only posts across social platforms. Ideal for announcements, updates, and text-based content.

Endpoint: POST /api/upload_text

Supported Platforms: X (Twitter), LinkedIn, Facebook, Threads, Reddit

Upload Management APIs
Upload Status
Track the progress and results of asynchronous uploads initiated with async_upload=true. Essential for monitoring long-running upload operations.

Endpoint: GET /api/uploadposts/status

Use Case: Check status of background uploads, get detailed results per platform

Upload History
Retrieve a paginated history of all your past uploads across platforms. Includes detailed metadata, success/failure status, and platform-specific information.

Endpoint: GET /api/uploadposts/history

Features: Pagination, filtering, comprehensive upload metadata

Schedule Management
Schedule posts for future publication across supported platforms. Manage your content calendar programmatically.

Endpoint: Various scheduling endpoints

Supported Platforms: X (Twitter), LinkedIn, Facebook, Instagram, TikTok

Platform Integration APIs
Analytics API
Retrieve detailed analytics and performance metrics for your social media profiles across connected platforms.

Endpoint: GET /api/analytics/{profile_username}

Supported Platforms: Instagram, TikTok, LinkedIn, Facebook, X (Twitter)

Metrics: Followers, impressions, reach, profile views, time-series data

Get Facebook Pages
Retrieve all Facebook pages accessible through connected accounts. Required for posting to specific Facebook pages.

Endpoint: GET /api/uploadposts/facebook/pages

Returns: Page IDs, names, profile pictures, account associations

Get LinkedIn Pages
Fetch LinkedIn company pages associated with your connected accounts. Essential for business page posting.

Endpoint: GET /api/uploadposts/linkedin/pages

Returns: Organization URNs, company names, vanity URLs, page logos

Get Pinterest Boards
List all Pinterest boards (public and secret) from connected accounts. Required for targeting specific boards when pinning content.

Endpoint: GET /api/uploadposts/pinterest/boards

Returns: Board IDs, names, associated Pinterest accounts

User Management APIs
User Profiles API
Manage user profiles and generate JWTs for linking social accounts when integrating Upload-Post into your own platform. Essential for white-label integrations and multi-user applications.

Endpoints:

POST /api/uploadposts/users - Create user profiles
GET /api/uploadposts/users - Retrieve user profiles
DELETE /api/uploadposts/users - Delete user profiles
POST /api/uploadposts/users/generate-jwt - Generate authentication tokens
POST /api/uploadposts/users/validate-jwt - Validate tokens
See the User Profile Integration Guide for implementation workflow.

Content Requirements
Photo Requirements
Comprehensive format specifications, file size limits, aspect ratios, and technical requirements for photo uploads across all supported platforms.

Covers: Instagram, TikTok, Facebook, X (Twitter), LinkedIn, Threads, Pinterest, Reddit

Video Requirements
Detailed video format requirements, codec specifications, resolution limits, and encoding guidelines for optimal compatibility across platforms.

Covers: TikTok, Instagram, YouTube, LinkedIn, Facebook, X (Twitter), Threads, Pinterest

Includes: FFmpeg re-encoding solutions for compatibility issues

Getting Started
Authentication: All requests require an API key in the Authorization: Apikey your-api-key-here header
Base URL: https://api.upload-post.com/api
Rate Limits: Free tier includes 10 uploads per month
Content Guidelines: Review platform-specific requirements before uploading
For implementation examples and integration guides, see our SDK Examples and Integration Guides.


Manage Scheduled Posts
Schedule your uploads in advance and keep full control over them with our job management endpoints. This page covers how to list and cancel scheduled jobs created via the scheduled_date parameter.

List Scheduled Posts
Endpoint	GET /api/uploadposts/schedule
Authentication	Required. Supply the Apikey in the Authorization header — e.g. Authorization: Apikey <token>
Query / Body Params	None. The user is inferred from the access-token.
Success Response 200 OK
Returns a JSON array where each element is a scheduled-job object:

[
  {
    "job_id": "a1b2c3d4e5f67890a1b2c3d4e5f67890",
    "scheduled_date": "2024-12-25T10:30:00Z",
    "post_type": "video",
    "profile_username": "my_upload_post_profile",
    "title": "Merry Christmas!",
    "preview_url": "https://storage.googleapis.com/signed-url/video_preview.mp4?signature=..."
  }
]

Field	Type	Description
job_id	string	Unique identifier of the scheduled job. Required to cancel it.
scheduled_date	string	ISO-8601 date/time when the post will go live. Time is in UTC.
post_type	string	One of video, photo, or text.
profile_username	string	Upload-Post profile that will publish the content.
title	string	Title/caption of the post.
preview_url	string | null	Short-lived signed URL to preview the media (first photo or video). null for text posts.
Error Responses
Status	Reason
401 Unauthorized	Missing or invalid token.
Cancel a Scheduled Post
Endpoint	DELETE /api/uploadposts/schedule/<job_id>
Authentication	Required. Same Authorization header as above.
URL Param	job_id — ID obtained from the list endpoint.
Success Response 200 OK
{
  "success": true,
  "message": "Job <job_id> cancelled and assets deleted."
}

Error Responses
Status	Body	Condition
401 Unauthorized	 	Invalid or missing token.
404 Not Found	{ "success": false, "error": "Job not found" }	The supplied job_id does not exist or doesn't belong to the authenticated user.
500 Internal Server Error	 	Unexpected failure while cancelling the job or deleting its assets.
Edit a Scheduled Post
Endpoint	PATCH /api/uploadposts/schedule/<job_id>
Authentication	Required. Same Authorization header as above.
URL Param	job_id — ID obtained from the list endpoint.
Body	JSON object with one or more of the fields below.
Field	Type	Required	Description
scheduled_date	string	No	ISO-8601 date/time in UTC (suffix Z allowed). Must be in the future and within 1 year.
title	string	No	New post title/caption.
caption	string	No	New caption/description.
Success Response 200 OK
{
  "success": true,
  "job_id": "a1b2c3d4e5f67890a1b2c3d4e5f67890",
  "scheduled_date": "2025-10-05T10:30:00Z",
  "title": "Updated title",
  "caption": "Updated caption"
}

Error Responses
Status	Body	Condition
400 Bad Request	{ "success": false, "error": "<reason>" }	Invalid body; invalid/past date; job not editable; daily limit reached.
401 Unauthorized	 	Invalid or missing token.
403 Forbidden	{ "success": false, "error": "Forbidden" }	The job does not belong to the authenticated user.
404 Not Found	{ "success": false, "error": "Job not found" }	The supplied job_id does not exist.
500 Internal Server Error	 	Unexpected failure while editing the job.
Example Request
curl -X PATCH "https://api.upload-post.com/api/uploadposts/schedule/JOB_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey <token>" \
  -d '{
    "scheduled_date": "2025-10-05T10:30:00Z",
    "title": "Updated title",
    "caption": "Updated caption"
  }'

See Also
Using scheduled_date when uploading content – parameter description.
Upload Video, Upload Photos, Upload Text – endpoints that support scheduling.

___


