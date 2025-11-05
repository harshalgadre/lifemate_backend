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
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Get styling options
      const { styling = {} } = resumeData;
      const primaryColor = "#000000";
      const accentColor = "#000000";
      const fontSize = 10;

      // Helper function to add section header with separator line
      const addSectionHeader = (title) => {
        doc.moveDown(0.5);

        // Add horizontal line before section
        const lineY = doc.y;
        doc
          .moveTo(doc.page.margins.left, lineY)
          .lineTo(doc.page.width - doc.page.margins.right, lineY)
          .strokeColor("#CCCCCC")
          .lineWidth(0.5)
          .stroke();

        doc.moveDown(0.3);
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor(primaryColor)
          .text(title);
        doc.moveDown(0.3);
        doc.font("Helvetica");
      };

      // 1. HEADER - Personal Information (Centered, Large Name)
      const { personalInfo } = resumeData;
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(personalInfo.fullName || "N/A", { align: "center" });

      doc.moveDown(0.2);

      // Location
      if (personalInfo.address?.city && personalInfo.address?.state) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(primaryColor)
          .text(
            `${personalInfo.address.city}, ${personalInfo.address.state}, ${
              personalInfo.address.country || "India"
            }`,
            { align: "center" }
          );
      }

      doc.moveDown(0.2);

      // Contact info line (phone | email | links)
      const contactInfo = [];
      if (personalInfo.phone) contactInfo.push(personalInfo.phone);
      if (personalInfo.email) contactInfo.push(personalInfo.email);
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
          .fillColor("#333333")
          .text(contactInfo.join("    "), { align: "center" });
      }

      doc.moveDown(0.5);
      if (resumeData.summary) {
        // 1. SUMMARY
        addSectionHeader("Professional Summary");
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(primaryColor)
          .text(resumeData.summary);
      }

      // 2. EDUCATION (First, like in the image)
      if (resumeData.education && resumeData.education.length > 0) {
        const visibleEdu = resumeData.education.filter(
          (edu) => edu.isVisible !== false
        );
        if (visibleEdu.length > 0) {
          addSectionHeader("Education");

          visibleEdu.forEach((edu, index) => {
            // Institution name (bold)
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(primaryColor)
              .text(edu.institution, { continued: false });

            // Degree and year on same line
            doc
              .fontSize(9)
              .font("Helvetica-Oblique")
              .fillColor("#333333")
              .text(`${edu.degree} in ${edu.field}`, { continued: true });

            // Year range on right (if available)
            if (edu.yearOfCompletion) {
              const startYear = edu.yearOfCompletion - 4; // Assuming 4 year degree
              doc.text(`    ${startYear}-${edu.yearOfCompletion}`, {
                align: "left",
              });
            }

            // Grade if available
            if (edu.grade) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .text(`${edu.grade}`, { align: "left" });
            }

            if (index < visibleEdu.length - 1) {
              doc.moveDown(0.4);
            }
          });
        }
      }

      // 3. TECHNICAL SKILLS
      if (resumeData.skills && resumeData.skills.length > 0) {
        const visibleSkills = resumeData.skills.filter(
          (skill) => skill.isVisible !== false
        );
        if (visibleSkills.length > 0) {
          addSectionHeader("Technical Skills");

          // Group skills by category if possible, otherwise list all
          const skillNames = visibleSkills.map((s) => s.name).join(", ");

          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("Languages: ", { continued: true })
            .font("Helvetica")
            .text(skillNames);

          // If you have technologies/frameworks in projects, show them here
          doc.moveDown(0.2);
        }
      }

      // 4. WORK EXPERIENCE
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        const visibleExp = resumeData.workExperience.filter(
          (exp) => exp.isVisible !== false
        );
        if (visibleExp.length > 0) {
          addSectionHeader("Experience");

          visibleExp.forEach((exp, index) => {
            // Company name (bold) and date range on same line
            const startDate = formatDate(exp.startDate);
            const endDate = exp.isCurrent ? "Present" : formatDate(exp.endDate);

            // Company name
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(primaryColor)
              .text(exp.company, { continued: true });

            // Date range aligned right
            const dateText = `${startDate} – ${endDate}`;
            const textWidth = doc.widthOfString(exp.company);
            const pageWidth =
              doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const dateWidth = doc.widthOfString(dateText);
            const spacesNeeded = pageWidth - textWidth - dateWidth - 20;

            doc.text(
              " ".repeat(Math.max(1, Math.floor(spacesNeeded / 3))) + dateText
            );

            // Position (italic)
            doc
              .fontSize(9)
              .font("Helvetica-Oblique")
              .fillColor("#333333")
              .text(exp.position, { continued: true });

            // Location on right
            if (exp.location) {
              doc.text(`    ${exp.location}`);
            } else {
              doc.text("");
            }

            // Description
            if (exp.description) {
              doc.moveDown(0.1);
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor(primaryColor)
                .text(exp.description);
            }

            // Achievements as bullet points
            if (exp.achievements && exp.achievements.length > 0) {
              doc.moveDown(0.1);
              exp.achievements.forEach((achievement) => {
                doc
                  .fontSize(9)
                  .font("Helvetica")
                  .text(`• ${achievement}`, { indent: 0, paragraphGap: 2 });
              });
            }

            if (index < visibleExp.length - 1) {
              doc.moveDown(0.5);
            }
          });
        }
      }

      // 5. PROJECTS
      if (resumeData.projects && resumeData.projects.length > 0) {
        const visibleProjects = resumeData.projects.filter(
          (proj) => proj.isVisible !== false
        );
        if (visibleProjects.length > 0) {
          addSectionHeader("Projects");

          visibleProjects.forEach((proj, index) => {
            // Project title with technologies and links in same line
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(primaryColor)
              .text(proj.title, { continued: true });

            // Add technologies inline with separators
            if (proj.technologies && proj.technologies.length > 0) {
              doc
                .font("Helvetica-Oblique")
                .fontSize(9)
                .fillColor("#333333")
                .text(` | ${proj.technologies.join(", ")}`, {
                  continued: true,
                });
            }

            // Add links (GitHub, Link, etc.)
            if (proj.url) {
              doc
                .font("Helvetica-Bold")
                .fillColor("#0066cc")
                .text(` | Link`, { link: proj.url, underline: true });
            } else {
              doc.text(""); // End line
            }

            // Description as bullet points
            if (proj.description) {
              doc.moveDown(0.1);
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor(primaryColor)
                .text(`• ${proj.description}`, { indent: 0 });
            }

            if (index < visibleProjects.length - 1) {
              doc.moveDown(0.4);
            }
          });
        }
      }

      // 6. EXTRACURRICULAR AND ACHIEVEMENTS (Custom Sections)
      if (resumeData.customSections && resumeData.customSections.length > 0) {
        const visibleSections = resumeData.customSections.filter(
          (sec) => sec.isVisible !== false
        );
        if (visibleSections.length > 0) {
          addSectionHeader("Extracurricular and Achievements");

          visibleSections.forEach((section) => {
            if (section.items && section.items.length > 0) {
              section.items.forEach((item) => {
                doc
                  .fontSize(9)
                  .font("Helvetica")
                  .fillColor(primaryColor)
                  .text(`• ${item}`, { indent: 0 });
              });
            } else if (section.content) {
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor(primaryColor)
                .text(`• ${section.content}`, { indent: 0 });
            }
          });
        }
      }

      // 7. CERTIFICATIONS (if any)
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        const visibleCerts = resumeData.certifications.filter(
          (cert) => cert.isVisible !== false
        );
        if (visibleCerts.length > 0) {
          addSectionHeader("Certifications");

          visibleCerts.forEach((cert, index) => {
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor(primaryColor)
              .text(`• ${cert.name} - ${cert.issuingOrganization}`, {
                indent: 0,
              });

            if (index < visibleCerts.length - 1) {
              doc.moveDown(0.2);
            }
          });
        }
      }

      // 8. LANGUAGES (if any)
      if (resumeData.languages && resumeData.languages.length > 0) {
        const visibleLangs = resumeData.languages.filter(
          (lang) => lang.isVisible !== false
        );
        if (visibleLangs.length > 0) {
          addSectionHeader("Languages");

          const langText = visibleLangs
            .map((lang) => `${lang.name} (${lang.proficiency})`)
            .join(", ");
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(primaryColor)
            .text(langText);
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
    // Generate PDF buffer
    const pdfBuffer = await generateResumePDF(resumeData);

    // Upload to Cloudinary
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
