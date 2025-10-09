# Hướng dẫn Setup OAuth Google và Facebook

## 1. Cài đặt Dependencies

```bash
npm install passport passport-google-oauth20 passport-facebook axios
```

## 2. Setup Google OAuth

### Bước 1: Tạo Google OAuth App
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Chọn "Web application"
6. Điền thông tin:
   - Name: Tên ứng dụng của bạn
   - Authorized JavaScript origins: `http://localhost:3001`
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
7. Lưu lại `Client ID` và `Client Secret`

### Bước 2: Cấu hình Environment Variables
Tạo file `.env` và thêm:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

## 3. Setup Facebook OAuth

### Bước 1: Tạo Facebook App
1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Chọn "Consumer" và điền thông tin
4. Vào "Facebook Login" > "Settings"
5. Thêm Valid OAuth Redirect URIs: `http://localhost:3001/api/auth/facebook/callback`
6. Lưu lại `App ID` và `App Secret`

### Bước 2: Cấu hình Environment Variables
Thêm vào file `.env`:

```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback
```

## 4. API Endpoints

### Google OAuth
- **POST** `/api/auth/google`
  - Body: `{ "accessToken": "google_access_token" }`
  - Response: JWT token và user info

### Facebook OAuth
- **POST** `/api/auth/facebook`
  - Body: `{ "accessToken": "facebook_access_token" }`
  - Response: JWT token và user info

### Link Accounts (Yêu cầu authentication)
- **POST** `/api/auth/link/google`
  - Body: `{ "accessToken": "google_access_token" }`
  - Headers: `Authorization: Bearer <jwt_token>`

- **POST** `/api/auth/link/facebook`
  - Body: `{ "accessToken": "facebook_access_token" }`
  - Headers: `Authorization: Bearer <jwt_token>`

## 5. Cách sử dụng từ Frontend

### Google OAuth (Frontend)
```javascript
// Sử dụng Google Sign-In API
function signInWithGoogle() {
  google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    callback: handleCredentialResponse
  });
  
  google.accounts.id.prompt();
}

async function handleCredentialResponse(response) {
  const accessToken = response.credential;
  
  const result = await fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accessToken })
  });
  
  const data = await result.json();
  // Lưu token và redirect
  localStorage.setItem('token', data.token);
}
```

### Facebook OAuth (Frontend)
```javascript
// Sử dụng Facebook SDK
function signInWithFacebook() {
  FB.login(function(response) {
    if (response.authResponse) {
      const accessToken = response.authResponse.accessToken;
      
      fetch('/api/auth/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken })
      })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('token', data.token);
      });
    }
  }, {scope: 'email'});
}
```

## 6. Database Schema

User model đã được cập nhật với các trường:

```javascript
{
  googleId: String,        // ID từ Google
  facebookId: String,      // ID từ Facebook
  provider: String,        // 'local', 'google', 'facebook'
  isEmailVerified: Boolean // true cho OAuth users
}
```

## 7. Test

1. Khởi động server: `npm start`
2. Test API bằng Postman hoặc frontend
3. Kiểm tra database để xem user được tạo với đầy đủ thông tin

## 8. Lưu ý

- Đảm bảo CORS được cấu hình đúng cho frontend
- Bảo mật JWT secret key
- Validate access token từ Google/Facebook
- Xử lý lỗi khi user từ chối quyền truy cập 