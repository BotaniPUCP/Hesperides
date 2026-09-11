package pe.edu.pucp.hesperides.modules.auth.service;

import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;

public interface AuthService {

    LoginResult login(LoginRequest request, ClientType clientType, String userAgent);

    LoginResult refresh(String rawRefreshToken, ClientType clientType, String userAgent);

    void logout(String rawRefreshToken);

    UserResponse currentUser(String email);

    record LoginResult(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
    }
}
