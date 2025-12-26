export const freezeAlertTemplate = ({
    alert,
    color,
    alertTime,
    streamName,
    streamUrl,
}) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${alert}</title>
</head>

<body
    style="display:flex;justify-content:center;align-items:center;padding-top:40px;background-color:#f4f4f4;margin:0;font-family:Arial,Helvetica,sans-serif;">
    
    <div style="background-color:#ffffff;max-width:800px;width:100%;margin:auto;border-radius:6px;overflow:hidden;">

        <!-- Header -->
        <div style="padding-top:30px; padding-bottom: 10px; text-align:center;background-color:#5d5d5d;">
            <h1 style="color:#ffffff;margin:0;">OTT Media Server</h1>
            <p style="color:#ffffff; font-size:16px; ">
                Stream Monitoring Alert
            </p>
        </div>

        <!-- Content -->
        <div style="border:1px solid #ddd;text-align:center;padding:30px;">
            <h1 style="color:${color};margin-bottom:20px;">
                ${alert}
            </h1>

            <p style="font-size:18px;color:#444;margin-bottom:15px;">
                ${alert} on the following stream:
            </p>

            <p style="font-size:20px;color:#000;font-weight:bold;margin-bottom:25px;">
                ${streamName}
            </p>

            <div style="background:#f9f9f9;padding:15px;border-radius:4px;margin:0 auto;max-width:500px;">
                <p style="font-size:16px;color:#555;margin:8px 0;">
                    <strong>Time:</strong> ${alertTime}
                </p>
                <p style="font-size:16px;color:#555;margin:8px 0;">
                    <strong>Stream URL:</strong>
                    <span style="word-break:break-all;">${streamUrl}</span>
                </p>
            </div>

            <p style="font-size:14px;color:#777;margin-top:30px;">
                This is an automated alert from the OTT Media Server monitoring system.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:15px;font-size:13px;color:#999;">
            © 2025 OTT Media Server · Automated Alert
        </div>

    </div>
</body>
</html>

`
}