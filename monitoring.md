# BakerMaiden Monitoring Setup

## Health Check Endpoint

The application includes a health check endpoint at `/api/health` that provides:

- Application status
- Database connectivity
- Uptime information
- Environment details
- Version information

### Usage

```bash
# Check application health
curl https://your-app.vercel.app/api/health

# Expected response (healthy)
{
  "status": "healthy",
  "timestamp": "2024-01-30T10:00:00.000Z",
  "database": "connected",
  "uptime": 3600,
  "environment": "production",
  "version": "0.1.0"
}

# Response when unhealthy
{
  "status": "unhealthy",
  "timestamp": "2024-01-30T10:00:00.000Z",
  "database": "disconnected",
  "error": "Connection timeout",
  "uptime": 3600,
  "environment": "production",
  "version": "0.1.0"
}
```

## Vercel Monitoring

### Built-in Analytics
- **Vercel Analytics**: Automatic page view tracking
- **Web Vitals**: Core performance metrics
- **Function Logs**: API route execution logs
- **Deployment History**: Track successful/failed deployments

### Access Monitoring
1. Go to your Vercel project dashboard
2. Click on **Analytics** tab
3. View performance metrics and user traffic

## Supabase Monitoring

### Database Metrics
- **Query Performance**: Slow query identification
- **Connection Pool**: Active connections monitoring
- **Storage Usage**: Database size tracking
- **API Usage**: Request volume and response times

### Access Database Monitoring
1. Go to your Supabase project dashboard
2. Navigate to **Reports** section
3. View database performance metrics

## External Monitoring Options

### 1. Uptime Monitoring

**UptimeRobot (Free)**
```bash
# Add your health check endpoint
URL: https://your-app.vercel.app/api/health
Method: GET
Expected Status: 200
Check Interval: 5 minutes
```

**Pingdom**
```bash
# Similar setup with more detailed reporting
URL: https://your-app.vercel.app/api/health
Expected Response: "healthy"
Check Interval: 1 minute
```

### 2. Error Tracking

**Sentry Setup**
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

### 3. Performance Monitoring

**Vercel Speed Insights**
```bash
npm install @vercel/speed-insights
```

```javascript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## Alerting Setup

### 1. Email Alerts
Configure alerts for:
- Application downtime (health check fails)
- Database connection failures
- High error rates
- Performance degradation

### 2. Slack Integration
```bash
# Webhook URL for Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Custom Alerts
Create alerts for business metrics:
- New recipe creations
- Inventory low stock warnings
- User activity spikes

## Key Metrics to Monitor

### Performance Metrics
- **Response Time**: API endpoints < 500ms
- **Page Load Time**: < 2 seconds first load
- **Database Query Time**: < 100ms average
- **Error Rate**: < 1% of requests

### Business Metrics
- **Recipe Creation Rate**: New recipes per day
- **Inventory Updates**: Stock changes frequency
- **User Engagement**: Page views and session duration

### System Metrics
- **Memory Usage**: Keep under 80% of available
- **CPU Usage**: Monitor for spikes
- **Database Connections**: Stay within limits
- **Storage Usage**: Track growth trends

## Troubleshooting Guide

### Common Issues

**Database Connection Timeouts**
```bash
# Check Supabase project status
# Verify DATABASE_URL environment variable
# Monitor connection pool usage
```

**High Response Times**
```bash
# Check Vercel function logs
# Analyze database query performance
# Review code for blocking operations
```

**Memory Leaks**
```bash
# Monitor function memory usage in Vercel
# Check for unclosed database connections
# Review component re-rendering patterns
```

### Debug Commands

```bash
# Local health check
curl http://localhost:3000/api/health

# Check environment variables
npm run env

# Database connection test
npm run db:push --dry-run

# TypeScript compilation check
npm run type-check

# Lint for potential issues
npm run lint
```

## Performance Baselines

### Target Metrics
- **Health Check Response**: < 200ms
- **Recipe List Load**: < 500ms
- **Database Queries**: < 100ms average
- **Page Load (cached)**: < 1 second
- **Page Load (fresh)**: < 3 seconds

### Acceptable Limits
- **Response Time**: 95th percentile < 1 second
- **Error Rate**: < 2% overall
- **Uptime**: > 99.5%
- **Database Response**: 95th percentile < 300ms

## Scaling Indicators

Monitor these metrics to know when to scale:

**Database Scaling**
- Connection pool utilization > 80%
- Query response time > 500ms consistently
- Storage usage > 80% of limit

**Application Scaling** 
- Response times increasing over time
- Error rates climbing above 2%
- Memory usage consistently high

**Infrastructure Scaling**
- Function timeout errors
- Cold start frequency increasing
- Bandwidth approaching limits

This monitoring setup provides comprehensive visibility into your BakerMaiden application's health and performance.