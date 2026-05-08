package utils

import (
	"fmt"
	"net/smtp"

	"lead-finder/configs"
)

// SendOTPEmail sends an OTP email to the user
func SendOTPEmail(toEmail, otp string) error {
	config := configs.GetConfig()

	if config.SMTPUser == "" || config.SMTPPassword == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	from := config.SMTPFrom
	if from == "" {
		from = config.SMTPUser
	}

	subject := "Subject: Password Reset OTP\n"
	headers := "MIME-Version: 1.0\nContent-Type: text/plain; charset=\"utf-8\"\n"
	body := fmt.Sprintf("Your OTP is: %s\n\nThis OTP will expire in 5 minutes.", otp)
	msg := []byte(subject + headers + "\n" + body)

	addr := fmt.Sprintf("%s:%s", config.SMTPHost, config.SMTPPort)
	auth := smtp.PlainAuth("", config.SMTPUser, config.SMTPPassword, config.SMTPHost)

	err := smtp.SendMail(addr, auth, from, []string{toEmail}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
