/**
 * Resume Summary Chain
 * Feature 1: AI Resume Summary Generator
 * 
 * Takes a resume document and generates a compelling professional summary
 * using LangChain.js prompt templates and Google Gemini
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { getLLM } = require('./llmConfig');
const { aiConfig } = require('../../config/ai');

/**
 * Format work experience entries into a readable string
 * @param {Array} workExperience - Array of work experience objects from Resume model
 * @returns {string}
 */
const formatWorkExperience = (workExperience) => {
  if (!workExperience || workExperience.length === 0) {
    return 'No work experience listed';
  }

  return workExperience
    .filter((exp) => exp.isVisible !== false)
    .map((exp) => {
      const duration = exp.isCurrent
        ? `${new Date(exp.startDate).getFullYear()} – Present`
        : `${new Date(exp.startDate).getFullYear()} – ${new Date(exp.endDate).getFullYear()}`;
      
      let entry = `• ${exp.position} at ${exp.company} (${duration})`;
      if (exp.location) entry += ` — ${exp.location}`;
      if (exp.description) entry += `\n  ${exp.description}`;
      if (exp.achievements && exp.achievements.length > 0) {
        entry += `\n  Achievements: ${exp.achievements.join('; ')}`;
      }
      return entry;
    })
    .join('\n');
};

/**
 * Format education entries into a readable string
 * @param {Array} education - Array of education objects from Resume model
 * @returns {string}
 */
const formatEducation = (education) => {
  if (!education || education.length === 0) {
    return 'No education listed';
  }

  return education
    .filter((edu) => edu.isVisible !== false)
    .map((edu) => {
      let entry = `• ${edu.degree} in ${edu.field} — ${edu.institution} (${edu.yearOfCompletion})`;
      if (edu.grade) entry += ` | Grade: ${edu.grade}`;
      return entry;
    })
    .join('\n');
};

/**
 * Format skills into a readable string
 * @param {Array} skills - Array of skill objects from Resume model
 * @returns {string}
 */
const formatSkills = (skills) => {
  if (!skills || skills.length === 0) {
    return 'No skills listed';
  }

  return skills
    .filter((skill) => skill.isVisible !== false)
    .map((skill) => {
      return skill.proficiency
        ? `${skill.name} (${skill.proficiency})`
        : skill.name;
    })
    .join(', ');
};

/**
 * Format certifications into a readable string
 * @param {Array} certifications - Array of certification objects from Resume model
 * @returns {string}
 */
const formatCertifications = (certifications) => {
  if (!certifications || certifications.length === 0) {
    return 'No certifications listed';
  }

  return certifications
    .filter((cert) => cert.isVisible !== false)
    .map((cert) => {
      let entry = `• ${cert.name} — ${cert.issuingOrganization}`;
      if (cert.issueDate) entry += ` (${new Date(cert.issueDate).getFullYear()})`;
      return entry;
    })
    .join('\n');
};

/**
 * Format projects into a readable string
 * @param {Array} projects - Array of project objects from Resume model
 * @returns {string}
 */
const formatProjects = (projects) => {
  if (!projects || projects.length === 0) {
    return 'No projects listed';
  }

  return projects
    .filter((proj) => proj.isVisible !== false)
    .map((proj) => {
      let entry = `• ${proj.title}`;
      if (proj.description) entry += `: ${proj.description}`;
      if (proj.technologies && proj.technologies.length > 0) {
        entry += ` [Tech: ${proj.technologies.join(', ')}]`;
      }
      return entry;
    })
    .join('\n');
};

/**
 * Get tone-specific instructions for the prompt
 * @param {string} tone - "professional", "creative", or "concise"
 * @returns {string}
 */
const getToneInstructions = (tone) => {
  switch (tone) {
    case 'creative':
      return `Write in a creative, engaging tone that showcases personality while remaining professional. 
Use dynamic language, power verbs, and a compelling narrative style. 
Make the reader want to learn more about this candidate.`;
    
    case 'concise':
      return `Write a brief, impactful summary in 2-3 sentences maximum. 
Focus only on the most impressive qualifications and unique value proposition. 
Every word should count — no filler language.`;
    
    case 'professional':
    default:
      return `Write in a polished, formal professional tone suitable for corporate and healthcare environments. 
Use industry-standard language and highlight measurable achievements. 
The summary should convey authority and competence.`;
  }
};

/**
 * Generate a professional summary for a resume using AI
 * 
 * @param {Object} resume - The resume document from MongoDB (plain object)
 * @param {string} tone - The desired tone: "professional", "creative", or "concise"
 * @returns {Promise<string>} The generated summary text
 */
const generateResumeSummary = async (resume, tone = 'professional') => {
  // Validate tone
  if (!aiConfig.summary.allowedTones.includes(tone)) {
    throw new Error(`Invalid tone: "${tone}". Allowed: ${aiConfig.summary.allowedTones.join(', ')}`);
  }

  // Extract and format resume data
  const fullName = resume.personalInfo?.fullName || 'the candidate';
  const workExperience = formatWorkExperience(resume.workExperience);
  const education = formatEducation(resume.education);
  const skills = formatSkills(resume.skills);
  const certifications = formatCertifications(resume.certifications);
  const projects = formatProjects(resume.projects);
  const toneInstructions = getToneInstructions(tone);

  // Build the LangChain prompt template
  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an expert resume writer specializing in healthcare and medical professionals. 
Your task is to generate a compelling professional summary for a resume.

RULES:
- Write ONLY the summary paragraph(s). Do NOT include headers, labels, or explanations.
- The summary must be between 50 and 250 words.
- Highlight the candidate's strongest qualifications, key skills, and career achievements.
- If the candidate has healthcare/medical experience, emphasize domain expertise.
- Use active voice and strong action words.
- Do NOT fabricate any information — only use what is provided.
- Do NOT include contact information in the summary.

TONE INSTRUCTIONS:
{toneInstructions}`,
    ],
    [
      'human',
      `Generate a professional summary for the following resume:

CANDIDATE NAME: {fullName}

WORK EXPERIENCE:
{workExperience}

EDUCATION:
{education}

SKILLS:
{skills}

CERTIFICATIONS:
{certifications}

PROJECTS:
{projects}

Please write a compelling {tone} professional summary for this candidate.`,
    ],
  ]);

  // Create the chain: prompt → LLM → string output
  const llm = getLLM();
  const outputParser = new StringOutputParser();
  const chain = promptTemplate.pipe(llm).pipe(outputParser);

  // Invoke the chain with the resume data
  const summary = await chain.invoke({
    fullName,
    workExperience,
    education,
    skills,
    certifications,
    projects,
    tone,
    toneInstructions,
  });

  // Trim and validate the output
  const trimmedSummary = summary.trim();

  if (!trimmedSummary) {
    throw new Error('AI generated an empty summary. Please try again.');
  }

  // Enforce max length from config (matches Resume schema)
  if (trimmedSummary.length > aiConfig.summary.maxLength) {
    return trimmedSummary.substring(0, aiConfig.summary.maxLength);
  }

  return trimmedSummary;
};

module.exports = { generateResumeSummary };
