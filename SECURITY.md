# SnapVault Security Documentation

## Overview

SnapVault implements a comprehensive multi-layered security approach to protect user files and prevent unauthorized access. This document outlines the security measures implemented and best practices for maintaining a secure file vault.

## Security Architecture

### 1. Authentication & Session Management

- **Session-based Authentication**: Uses JWT tokens for secure session management
- **Secure Password Hashing**: bcrypt with 12 rounds for password storage
- **Session Expiry**: Configurable session duration (default: 7 days)
- **Automatic Cleanup**: Expired sessions are automatically removed

### 2. Secure File Access System

#### Traditional Access Token Issues (Resolved)
The original system had several vulnerabilities:
- Long-lived access tokens that never expired
- Direct file access without authentication verification
- No access revocation capabilities
- Lack of audit logging

#### New Secure Access Implementation

**Signed URLs with Time-based Expiry**
- Files are accessed through cryptographically signed URLs
- Default expiry: 15 minutes (configurable, max 24 hours)
- URLs are signed with HMAC-SHA256 using a secret key
- Automatic invalidation after expiry

**Session Validation**
- Private files require valid session tokens
- File ownership verification for all private file access
- Public files have limited access controls

**IP Address Restrictions**
- Optional IP binding for generated URLs
- Prevents link sharing across different networks
- Configurable per-URL generation

**User Agent Verification**
- Optional browser/client binding
- Additional layer against link sharing
- Hashed storage for privacy

### 3. Access Control & Authorization

#### File Ownership Model
- Users can only access files they own (private files)
- Public files have controlled access patterns
- No cross-user file access without explicit permissions

#### Action-Specific URLs
- **Download**: Full file download with appropriate headers
- **View**: Inline viewing (e.g., images, PDFs)
- **Info**: Metadata access only

#### Rate Limiting
- **File Access**: 30 requests per 15 minutes per IP
- **URL Generation**: 20 URLs per 10 minutes per IP
- **Batch Operations**: 5 batch requests per 10 minutes per IP

### 4. Audit Logging & Monitoring

#### Comprehensive Access Logging
All file access attempts are logged with:
- File ID and user ID
- IP address (hashed for privacy)
- User agent (truncated)
- Action performed
- Success/failure status
- Timestamp
- Error details (if applicable)

#### Suspicious Activity Detection
Automatic detection of:
- High volume access patterns (>100 requests/24h)
- Multiple unique IP addresses (>20 different IPs)
- High failure rates (>50% failed attempts)
- Brute force patterns

#### Security Dashboard
- Real-time access monitoring
- Visual statistics and alerts
- Suspicious activity notifications
- Detailed audit trails

### 5. Data Protection

#### File Storage Security
- Files stored outside web-accessible directories
- Unique, non-predictable file names
- Separate thumbnail storage
- Automatic cleanup of expired files

#### Sensitive Data Handling
- IP addresses are hashed before storage
- User agents are truncated
- No plain-text storage of sensitive identifiers

#### Encryption at Rest
- Database stored locally with restricted access
- Environment variables for secrets
- Separate signing keys for different purposes

### 6. Network Security

#### CORS Configuration
- Restrictive CORS policies
- Origin validation for requests
- Credentials handling controls

#### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-Download-Options: noopen`
- `Referrer-Policy: no-referrer`
- `Cache-Control: private, no-cache, no-store`

#### Request Validation
- Input sanitization and validation
- File type restrictions
- Size limits enforcement
- Malicious file detection

## Configuration & Environment Security

### Required Environment Variables

```bash
# JWT Secret (CRITICAL - must be changed in production)
JWT_SECRET=your-super-secret-jwt-key-make-it-long-and-random

# Signed URL Secret (CRITICAL - must be different from JWT_SECRET)
SIGNED_URL_SECRET=your-signed-url-secret-also-long-and-random

# Application URL for CORS
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Rate limiting configuration
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_MINUTES=15

# URL expiry settings
DEFAULT_URL_EXPIRY=900  # 15 minutes
MAX_URL_EXPIRY=86400    # 24 hours
```

### Production Security Checklist

- [ ] Change all default secrets (`JWT_SECRET`, `SIGNED_URL_SECRET`)
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up secure session cookies
- [ ] Enable security headers
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Backup and recovery procedures

## API Security Features

### Secure URL Generation

```typescript
POST /api/files/generate-url
{
  "fileId": "file-uuid",
  "expiresIn": 900,           // seconds
  "action": "download",       // download|view|info
  "restrictToIP": true,       // bind to current IP
  "restrictToUserAgent": false // bind to current browser
}
```

### Access Monitoring

```typescript
GET /api/files/access-logs?timeRange=24h&fileId=optional
```

### Secure File Access

```
GET /api/files/secure/{fileId}?token={signed-jwt}&action={action}
```

## Threat Mitigation

### Prevented Attack Vectors

1. **Link Sharing Abuse**
   - Time-limited URLs prevent indefinite sharing
   - IP restrictions limit geographic sharing
   - Session validation for private files

2. **Brute Force Attacks**
   - Rate limiting on all endpoints
   - Failed attempt monitoring
   - Automatic blocking of suspicious IPs

3. **Session Hijacking**
   - Secure cookie configuration
   - IP binding options
   - Regular session rotation

4. **Data Exfiltration**
   - File ownership validation
   - Audit logging of all access
   - Suspicious pattern detection

5. **Cross-Site Attacks**
   - Strict CORS policies
   - Security headers
   - Input validation

### Monitoring & Alerting

#### Security Metrics Tracked
- Failed authentication attempts
- Unusual access patterns
- High-volume requests
- Geographic access anomalies
- Failed file access attempts

#### Alert Conditions
- More than 20 failed attempts in 15 minutes
- Access from more than 20 unique IPs in 24 hours
- Failure rate exceeding 30%
- Suspicious geographic access patterns

## Best Practices for Users

### Secure File Sharing
1. Use the shortest practical URL expiry time
2. Enable IP restrictions for sensitive files
3. Monitor access logs regularly
4. Revoke access when suspicious activity is detected

### Account Security
1. Use strong, unique passwords
2. Log out from shared devices
3. Monitor security dashboard regularly
4. Report suspicious activity immediately

## Development Security Guidelines

### Code Security
- Input validation on all endpoints
- Parameterized database queries
- Error handling without information disclosure
- Regular dependency updates

### Testing Security
- Automated security testing
- Penetration testing procedures
- Access control testing
- Rate limiting verification

## Incident Response

### Security Incident Procedure
1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Determine scope and impact
3. **Containment**: Block suspicious activity
4. **Investigation**: Review audit logs
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Emergency Actions
- Immediate session revocation
- File access suspension
- IP address blocking
- User notification procedures

## Compliance & Privacy

### Data Privacy
- Minimal data collection
- Hashed storage of sensitive data
- Automatic data retention limits
- User data deletion capabilities

### Audit Requirements
- Complete access logging
- Immutable audit trails
- Regular security assessments
- Compliance reporting

## Future Security Enhancements

### Planned Improvements
- Two-factor authentication
- Advanced threat detection
- Machine learning for anomaly detection
- Integration with security information systems
- Advanced encryption options
- Zero-knowledge architecture considerations

### Security Roadmap
- Q1: Enhanced monitoring and alerting
- Q2: Advanced authentication options
- Q3: Threat intelligence integration
- Q4: Security automation and orchestration

---

## Support & Reporting

For security issues or questions:
- Review this documentation
- Check the security dashboard
- Contact system administrators
- Report vulnerabilities responsibly

**Remember**: Security is a shared responsibility. Follow best practices and stay vigilant!
