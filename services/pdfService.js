const PDFDocument = require("pdfkit");
const { uploadToCloudinary } = require("../config/cloudinary");

/**
 * PDF Service for generating resume PDFs
 * Uses PDFKit for PDF generation
 */

/**
 * Format date to readable string
 */
function formatDate(date) {
  if (!date) return "Present";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Check if we need a new page
 */
function checkPageBreak(doc, spaceNeeded = 100) {
  if (doc.y + spaceNeeded > doc.page.height - 50) {
    doc.addPage();
    return true;
  }
  return false;
}

/**
 * Generate PDF from resume data
 * @param {Object} resumeData - Resume data from Resume model
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateResumePDF(resumeData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        bufferPages: true,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Get styling options
      const { styling = {} } = resumeData;
      const primaryColor = styling.primaryColor || "#000000";
      const accentColor = styling.accentColor || "#4169E1";
      const fontSize = styling.fontSize || 10;

      // Helper function to add section header with separator line
      const addSectionHeader = (title) => {
        checkPageBreak(doc, 80);

        doc.moveDown(0.5);

        // Add light gray separator line before section
        const lineY = doc.y;
        doc
          .moveTo(doc.page.margins.left, lineY)
          .lineTo(doc.page.width - doc.page.margins.right, lineY)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();

        doc.moveDown(0.3);
        // Always start headers at left margin to keep alignment consistent
        doc.x = doc.page.margins.left;
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor(accentColor)
          .text(title.toUpperCase(), doc.page.margins.left, undefined, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: "left",
          });
        doc.moveDown(0.3);
        doc.font("Helvetica").fillColor(primaryColor);
      };

      const maxWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // 1. HEADER - Personal Information
      const { personalInfo } = resumeData;
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(personalInfo.fullName || "N/A", { align: "left" });

      doc.moveDown(0.3);

      // Contact info line
      const contactInfo = [];
      if (personalInfo.email) contactInfo.push(personalInfo.email);
      if (personalInfo.phone) contactInfo.push(personalInfo.phone);
      if (personalInfo.linkedIn)
        contactInfo.push(
          personalInfo.linkedIn.replace(
            "https://linkedin.com/in/",
            "linkedin.com/"
          )
        );
      if (personalInfo.github)
        contactInfo.push(
          personalInfo.github.replace("https://github.com/", "github.com/")
        );
      if (personalInfo.website) contactInfo.push(personalInfo.website);

      if (contactInfo.length > 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#666666")
          .text(contactInfo.join(" • "), { align: "left" });
      }

      // Add horizontal line after contact info
      doc.moveDown(0.3);
      const lineY = doc.y;
      doc
        .moveTo(doc.page.margins.left, lineY)
        .lineTo(doc.page.width - doc.page.margins.right, lineY)
        .strokeColor("#CCCCCC")
        .lineWidth(1)
        .stroke();

      doc.moveDown(0.5);

      // PROFESSIONAL SUMMARY SECTION
      if (resumeData.summary && resumeData.summary.trim()) {
        addSectionHeader("PROFESSIONAL SUMMARY");

        doc
          .fontSize(fontSize)
          .font("Helvetica")
          .fillColor(primaryColor)
          .text(resumeData.summary, {
            align: "left",
            width: maxWidth,
            lineGap: 3,
          });

        doc.moveDown(0.4);
      }

      // WORK EXPERIENCE SECTION
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        const visibleExp = resumeData.workExperience.filter(
          (exp) => exp.isVisible !== false
        );
        if (visibleExp.length > 0) {
          addSectionHeader("WORK EXPERIENCE");

          visibleExp.forEach((exp, index) => {
            checkPageBreak(doc, 80);

            const startDate = formatDate(exp.startDate);
            const endDate = exp.isCurrent ? "Present" : formatDate(exp.endDate);
            const dateText = `${startDate} - ${endDate}`;

            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#000000")
              .text(exp.position || "Position", { continued: true });

            const posText = exp.position || "Position";
            const textWidth = doc.widthOfString(posText);
            const pageWidth = maxWidth;
            const dateWidth = doc.widthOfString(dateText);
            const spacesNeeded = pageWidth - textWidth - dateWidth - 20;

            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#666666")
              .text(
                " ".repeat(Math.max(1, Math.floor(spacesNeeded / 3))) + dateText
              );

            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#D2691E")
              .text(exp.company || "Company");

            if (exp.location) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#666666")
                .text(exp.location);
            }

            if (exp.description) {
              doc.moveDown(0.1);
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#333333")
                .text(exp.description, { width: maxWidth });
            }

            if (exp.achievements && exp.achievements.length > 0) {
              doc.moveDown(0.1);
              exp.achievements.forEach((achievement) => {
                doc
                  .fontSize(9)
                  .font("Helvetica")
                  .fillColor("#333333")
                  .text(`• ${achievement}`, { indent: 0, paragraphGap: 2 });
              });
            }

            if (index < visibleExp.length - 1) {
              doc.moveDown(0.6);
            }
          });
        }
      }

      // EDUCATION SECTION
      if (resumeData.education && resumeData.education.length > 0) {
        const visibleEdu = resumeData.education.filter(
          (edu) => edu.isVisible !== false
        );
        if (visibleEdu.length > 0) {
          addSectionHeader("EDUCATION");

          visibleEdu.forEach((edu, index) => {
            checkPageBreak(doc, 60);

            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#000000")
              .text(`${edu.degree} in ${edu.field}`);

            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#D2691E")
              .text(edu.institution);

            if (edu.yearOfCompletion) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#666666")
                .text(`${edu.yearOfCompletion}`);
            }

            if (edu.grade) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#666666")
                .text(`Grade: ${edu.grade}`);
            }

            if (index < visibleEdu.length - 1) {
              doc.moveDown(0.5);
            }
          });
        }
      }

      // SKILLS SECTION
      if (resumeData.skills && resumeData.skills.length > 0) {
        const visibleSkills = resumeData.skills.filter(
          (skill) => skill.isVisible !== false
        );
        if (visibleSkills.length > 0) {
          addSectionHeader("SKILLS");

          let xPos = doc.page.margins.left;
          const badgeHeight = 18;
          const badgePadding = 10;
          const badgeSpacing = 8;
          const lineHeight = 26;
          let currentLineY = doc.y;

          visibleSkills.forEach((skill, index) => {
            const skillText = skill.name;
            doc.fontSize(9).font("Helvetica");
            const textWidth = doc.widthOfString(skillText);
            const badgeWidth = textWidth + badgePadding * 2;
            const pageWidth = doc.page.width - doc.page.margins.right;

            if (xPos + badgeWidth > pageWidth && index > 0) {
              xPos = doc.page.margins.left;
              currentLineY += lineHeight;
            }

            doc
              .roundedRect(xPos, currentLineY, badgeWidth, badgeHeight, 4)
              .fillAndStroke("#E8E8E8", "#E8E8E8");

            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#333333")
              .text(skillText, xPos + badgePadding, currentLineY + 4, {
                width: textWidth,
                lineBreak: false,
              });

            xPos += badgeWidth + badgeSpacing;
          });

          doc.y = currentLineY + badgeHeight + 5;
          // Reset x so the next section header starts at left margin
          doc.x = doc.page.margins.left;
          doc.moveDown(0.3);
        }
      }

      // PROJECTS SECTION
      if (resumeData.projects && resumeData.projects.length > 0) {
        const visibleProjects = resumeData.projects.filter(
          (proj) => proj.isVisible !== false
        );
        if (visibleProjects.length > 0) {
          addSectionHeader("PROJECTS");

          visibleProjects.forEach((proj, index) => {
            checkPageBreak(doc, 60);

            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(primaryColor)
              .text(proj.title, { continued: true });

            if (proj.technologies && proj.technologies.length > 0) {
              doc
                .font("Helvetica-Oblique")
                .fontSize(9)
                .fillColor("#333333")
                .text(` | ${proj.technologies.join(", ")}`, {
                  continued: true,
                });
            }

            if (proj.url) {
              doc
                .font("Helvetica-Bold")
                .fillColor("#0066cc")
                .text(` | Link`, { link: proj.url, underline: true });
            } else {
              doc.text("");
            }

            if (proj.description) {
              doc.moveDown(0.1);
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor(primaryColor)
                .text(`• ${proj.description}`, { indent: 0, width: maxWidth });
            }

            if (index < visibleProjects.length - 1) {
              doc.moveDown(0.4);
            }
          });
        }
      }

      // CUSTOM SECTIONS
      if (resumeData.customSections && resumeData.customSections.length > 0) {
        const visibleSections = resumeData.customSections.filter(
          (sec) => sec.isVisible !== false
        );
        if (visibleSections.length > 0) {
          addSectionHeader("EXTRACURRICULAR AND ACHIEVEMENTS");

          visibleSections.forEach((section) => {
            if (section.items && section.items.length > 0) {
              section.items.forEach((item) => {
                doc
                  .fontSize(9)
                  .font("Helvetica")
                  .fillColor(primaryColor)
                  .text(`• ${item}`, { align: "left" });
              });
            } else if (section.content) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor(primaryColor)
                .text(`• ${section.content}`, { align: "left" });
            }
          });
        }
      }

      // CERTIFICATIONS SECTION (only if exists)
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        const visibleCerts = resumeData.certifications.filter(
          (cert) => cert.isVisible !== false
        );
        if (visibleCerts.length > 0) {
          addSectionHeader("CERTIFICATIONS");

          visibleCerts.forEach((cert, index) => {
            // Certification name (bold)
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#000000")
              .text(`• ${cert.name}`, { align: "left" });

            // Issuing organization (orange color like frontend)
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#D2691E")
              .text(`  ${cert.issuingOrganization}`, { align: "left" });

            // Issue and expiry dates on same line (gray)
            const dateInfo = [];
            if (cert.issueDate) {
              const issueDate = formatDate(cert.issueDate);
              dateInfo.push(`Issued: ${issueDate}`);
            }
            if (cert.expiryDate) {
              const expiryDate = formatDate(cert.expiryDate);
              dateInfo.push(`Expires: ${expiryDate}`);
            }
            
            if (dateInfo.length > 0) {
              doc
                .fontSize(8)
                .font("Helvetica")
                .fillColor("#666666")
                .text(`  ${dateInfo.join(" | ")}`, { align: "left" });
            }

            // Credential ID if available
            if (cert.credentialId) {
              doc
                .fontSize(8)
                .font("Helvetica")
                .fillColor("#666666")
                .text(`  ID: ${cert.credentialId}`, { align: "left" });
            }

            if (index < visibleCerts.length - 1) {
              doc.moveDown(0.4);
            }
          });
        }
      }

      // LANGUAGES SECTION
      if (resumeData.languages && resumeData.languages.length > 0) {
        const visibleLangs = resumeData.languages.filter(
          (lang) => lang.isVisible !== false
        );
        if (visibleLangs.length > 0) {
          addSectionHeader("LANGUAGES");

          const langText = visibleLangs
            .map((lang) => `${lang.name} (${lang.proficiency})`)
            .join(", ");
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(primaryColor)
            .text(langText, { width: maxWidth });
        }
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate and upload resume PDF to Cloudinary
 * @param {Object} resumeData - Resume data
 * @param {String} jobSeekerId - JobSeeker ID for folder organization
 * @returns {Promise<Object>} - Cloudinary upload result
 */
async function generateAndUploadResumePDF(resumeData, jobSeekerId) {
  try {
    const pdfBuffer = await generateResumePDF(resumeData);

    const uploadResult = await uploadToCloudinary(
      pdfBuffer,
      `lifemate/resumes/${jobSeekerId}`,
      "raw"
    );

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      bytes: uploadResult.bytes,
      filename: `${resumeData.title || "resume"}_${Date.now()}.pdf`,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate resume PDF");
  }
}

module.exports = {
  generateResumePDF,
  generateAndUploadResumePDF,
};
