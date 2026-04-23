package services

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// EmailService handles email sending
type EmailService struct {
	from     string
	password string
	host     string
	port     string
}

// NewEmailService creates a new email service
func NewEmailService() *EmailService {
	return &EmailService{
		from:     os.Getenv("EMAIL_FROM"),
		password: os.Getenv("EMAIL_PASSWORD"),
		host:     os.Getenv("EMAIL_HOST"),
		port:     os.Getenv("EMAIL_PORT"),
	}
}

// SendEmail sends an email
func (es *EmailService) SendEmail(to string, subject string, body string) error {
	// If credentials are not set, just log and return
	if es.from == "" || es.password == "" || es.host == "" || es.port == "" {
		log.Printf("Email service not configured. Would send: %s to %s", subject, to)
		return nil
	}

	// Set up authentication
	auth := smtp.PlainAuth("", es.from, es.password, es.host)

	// Create message
	msg := fmt.Sprintf("From: %s\r\n", es.from)
	msg += fmt.Sprintf("To: %s\r\n", to)
	msg += fmt.Sprintf("Subject: %s\r\n", subject)
	msg += "\r\n" + body

	// Send email
	err := smtp.SendMail(es.host+":"+es.port, auth, es.from, []string{to}, []byte(msg))
	if err != nil {
		log.Printf("Failed to send email to %s: %v", to, err)
		return err
	}

	log.Printf("Email sent to %s", to)
	return nil
}

// SendLeadsExport sends leads data via email
func (es *EmailService) SendLeadsExport(to string, filename string) error {
	subject := "Your Leads Export"
	body := fmt.Sprintf("Your leads export is ready: %s", filename)
	return es.SendEmail(to, subject, body)
}

// SendSearchNotification sends a search completion notification
func (es *EmailService) SendSearchNotification(to string, query string, count int) error {
	subject := "Search Complete"
	body := fmt.Sprintf("Your search for '%s' found %d leads.", query, count)
	return es.SendEmail(to, subject, body)
}

// ValidateEmailList validates a list of emails
func (es *EmailService) ValidateEmailList(emails []string) []string {
	var validEmails []string
	for _, email := range emails {
		if es.isValidEmail(email) {
			validEmails = append(validEmails, email)
		}
	}
	return validEmails
}

// isValidEmail performs simple email validation
func (es *EmailService) isValidEmail(email string) bool {
	if email == "" {
		return false
	}

	email = strings.TrimSpace(email)

	// Check for @ and dot
	if !strings.Contains(email, "@") {
		return false
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	localPart := parts[0]
	domain := parts[1]

	if len(localPart) == 0 || len(domain) == 0 {
		return false
	}

	if !strings.Contains(domain, ".") {
		return false
	}

	return true
}
