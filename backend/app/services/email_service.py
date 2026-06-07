import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv  # type: ignore

load_dotenv()

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_approval_email(to_email: str, full_name: str, confirm_token: str):
    """Send account approval email with confirmation link."""
    confirm_link = f"{FRONTEND_URL}/confirm?token={confirm_token}"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;background:linear-gradient(135deg, #fff0f0 0%, #e0f7fa 100%);border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:transparent;padding:32px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.05);">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px; border-collapse:collapse; width:32px; height:32px;">
                <tr>
                  <td width="16" height="16" style="background:#ff0000; font-size:0; line-height:0;">&nbsp;</td>
                  <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
                  <td width="16" height="16" style="background:#00BCD4; font-size:0; line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:0.1em;">NETINFO</h1>
              <p style="margin:8px 0 0;font-size:11px;color:#64748b;letter-spacing:0.2em;text-transform:uppercase;">Plateforme de Gestion de Projets IA</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px;">
              <!-- Status Badge -->
              <div style="text-align:center;margin-bottom:32px;">
                <span style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:12px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:8px 20px;border-radius:999px;border:1.5px solid #86efac;">
                  ✅ Compte Approuvé
                </span>
              </div>

              <h2 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0f172a;">Bonjour {full_name} 👋</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                Bonne nouvelle ! Votre demande d'accès à la plateforme <strong>NETINFO</strong> a été <strong style="color:#00BCD4;">approuvée par le manager</strong>. 
                Cliquez sur le bouton ci-dessous pour activer votre compte et accéder à votre espace de travail.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="{confirm_link}" style="display:inline-block;background:linear-gradient(135deg,#00BCD4,#0097a7);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:16px;letter-spacing:0.05em;box-shadow:0 8px 25px rgba(0,188,212,0.35);">
                  🚀 Activer mon compte
                </a>
              </div>

              <!-- Security Notice -->
              <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-top:24px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">🔒 Sécurité</p>
                <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  Ce lien est valide pendant <strong style="color:#475569;">24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.
                </p>
              </div>

              <!-- Link fallback -->
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
                Ou copiez ce lien dans votre navigateur :<br/>
                <a href="{confirm_link}" style="color:#00BCD4;word-break:break-all;font-size:11px;">{confirm_link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:transparent;padding:24px 32px;border-top:1px solid rgba(0,0,0,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © 2026 NETINFO — École d'Art et de Technologie<br/>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "✅ Votre compte NETINFO a été approuvé !"
    msg["From"] = f"NETINFO Platform <{SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"[EMAIL] Approval email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def send_rejection_email(to_email: str, full_name: str):
    """Send account rejection email."""
    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;background:linear-gradient(135deg, #fff0f0 0%, #e0f7fa 100%);border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:transparent;padding:32px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.05);">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px; border-collapse:collapse; width:32px; height:32px;">
                <tr>
                  <td width="16" height="16" style="background:#ff0000; font-size:0; line-height:0;">&nbsp;</td>
                  <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
                  <td width="16" height="16" style="background:#00BCD4; font-size:0; line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:0.1em;">NETINFO</h1>
              <p style="margin:8px 0 0;font-size:11px;color:#64748b;letter-spacing:0.2em;text-transform:uppercase;">Plateforme de Gestion de Projets IA</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:8px 20px;border-radius:999px;border:1.5px solid #fca5a5;">
                  ❌ Demande Refusée
                </span>
              </div>
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0f172a;">Bonjour {full_name},</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                Nous sommes désolés de vous informer que votre demande d'accès à la plateforme <strong>NETINFO</strong> a été refusée par le manager. 
                Pour toute question, veuillez contacter votre administrateur.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:transparent;padding:24px 32px;border-top:1px solid rgba(0,0,0,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">© 2026 NETINFO — École d'Art et de Technologie</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Votre demande de compte NETINFO"
    msg["From"] = f"NETINFO Platform <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_project_assignment_email(
    to_email: str,
    member_name: str,
    project_name: str,
    project_description: str = "",
    deadline: str = "",
    manager_name: str = "Le Manager",
):
    """Send notification email to a team member when assigned to a new project."""
    project_url = f"{FRONTEND_URL}/projects"
    desc_block = (
        f'<p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.7;">'
        f'<strong>Description :</strong> {project_description}</p>'
        if project_description else ""
    )
    deadline_block = (
        f'<p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.7;">'
        f'<strong>&#128197; Deadline :</strong> {deadline}</p>'
        if deadline else ""
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0"
        style="background:#ffffff;background:linear-gradient(135deg, #fff0f0 0%, #e0f7fa 100%);border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:transparent;padding:32px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.05);">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px; border-collapse:collapse; width:32px; height:32px;">
              <tr>
                <td width="16" height="16" style="background:#ff0000; font-size:0; line-height:0;">&nbsp;</td>
                <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td width="16" height="16" style="font-size:0; line-height:0;">&nbsp;</td>
                <td width="16" height="16" style="background:#00BCD4; font-size:0; line-height:0;">&nbsp;</td>
              </tr>
            </table>
            <h1 style="margin:0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:0.1em;">NETINFO</h1>
            <p style="margin:8px 0 0;font-size:11px;color:#64748b;letter-spacing:0.2em;text-transform:uppercase;">
              Plateforme de Gestion de Projets IA
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px;">
            <div style="text-align:center;margin-bottom:28px;">
              <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:800;
                letter-spacing:0.15em;text-transform:uppercase;padding:8px 20px;border-radius:999px;border:1.5px solid #93c5fd;">
                &#128640; Nouveau Projet Assign&eacute;
              </span>
            </div>

            <h2 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0f172a;">Bonjour {member_name} &#128075;</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
              <strong>{manager_name}</strong> vous a assign&eacute; &agrave; un nouveau projet sur la plateforme
              <strong>NETINFO</strong>. Vous faites d&eacute;sormais partie de l&rsquo;&eacute;quipe qui travaillera sur ce projet.
            </p>

            <!-- Project Card -->
            <div style="background:#f8fafc;border:2px solid #e0f2fe;border-radius:20px;padding:24px 28px;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:0.15em;">
                &#128193; Projet
              </p>
              <h3 style="margin:0 0 16px;font-size:20px;font-weight:900;color:#0f172a;">{project_name}</h3>
              {desc_block}
              {deadline_block}
              <p style="margin:0;font-size:13px;color:#64748b;">
                Connectez-vous &agrave; la plateforme pour consulter vos t&acirc;ches assign&eacute;es et collaborer avec votre &eacute;quipe.
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin:32px 0;">
              <a href="{project_url}"
                style="display:inline-block;background:linear-gradient(135deg,#00BCD4,#0097a7);color:#ffffff;
                font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:16px;
                letter-spacing:0.05em;box-shadow:0 8px 25px rgba(0,188,212,0.35);">
                &#128269; Voir mon projet
              </a>
            </div>

            <!-- Warning -->
            <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:16px;padding:18px 22px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.1em;">
                &#9888;&#65039; Action requise
              </p>
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                Votre participation est attendue. Veuillez vous connecter et consulter vos t&acirc;ches d&egrave;s que possible.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:transparent;padding:24px 32px;border-top:1px solid rgba(0,0,0,0.05);text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              &copy; 2026 NETINFO &mdash; &Eacute;cole d&rsquo;Art et de Technologie<br/>
              Cet email a &eacute;t&eacute; envoy&eacute; automatiquement, merci de ne pas y r&eacute;pondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Vous etes assigne au projet << {project_name} >> sur NETINFO"
    msg["From"] = f"NETINFO Platform <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"[EMAIL] Project assignment notification sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed project assignment email to {to_email}: {e}")
        return False
