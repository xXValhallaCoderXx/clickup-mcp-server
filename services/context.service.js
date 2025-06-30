const fs = require('fs');
const path = require('path');

class ContextService {
    constructor() {
        this.contextDir = path.join(__dirname, '..', 'context');
        this.contextFile = path.join(this.contextDir, 'company-context.md');
        this.ensureContextDirectory();
    }

    ensureContextDirectory() {
        if (!fs.existsSync(this.contextDir)) {
            fs.mkdirSync(this.contextDir, { recursive: true });
        }
    }

    getCompanyContext() {
        try {
            if (fs.existsSync(this.contextFile)) {
                return fs.readFileSync(this.contextFile, 'utf8');
            }
            return this.getDefaultContext();
        } catch (error) {
            console.warn('Could not read company context:', error.message);
            return this.getDefaultContext();
        }
    }

    saveCompanyContext(content) {
        try {
            this.ensureContextDirectory();
            fs.writeFileSync(this.contextFile, content, 'utf8');
            return { success: true, message: 'Context saved successfully' };
        } catch (error) {
            console.error('Error saving context:', error);
            return { success: false, error: error.message };
        }
    }

    getDefaultContext() {
        return `# Company & Project Context

## Tech Stack
- Modern web application
- Standard development practices
- Agile methodology

## Development Standards
- Code review required
- Automated testing
- CI/CD pipeline

*Edit this context to provide more specific information about your company and projects.*`;
    }

    // Extract key information from context for LLM prompts
    extractContextSummary() {
        const fullContext = this.getCompanyContext();
        
        // Parse the markdown to extract key sections
        const sections = this.parseMarkdownSections(fullContext);
        
        return {
            techStack: this.extractSection(sections, 'Tech Stack'),
            company: this.extractSection(sections, 'Company Information'),
            projects: this.extractSection(sections, 'Current Projects'),
            standards: this.extractSection(sections, 'Development Standards'),
            commonIssues: this.extractSection(sections, 'Common Issues'),
            teamStructure: this.extractSection(sections, 'Team Structure')
        };
    }

    parseMarkdownSections(content) {
        const sections = {};
        const lines = content.split('\n');
        let currentSection = null;
        let currentContent = [];

        for (const line of lines) {
            if (line.startsWith('## ')) {
                // Save previous section
                if (currentSection) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                // Start new section
                currentSection = line.replace('## ', '').trim();
                currentContent = [];
            } else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        return sections;
    }

    extractSection(sections, sectionName) {
        const section = sections[sectionName];
        if (!section) return null;

        // Clean up the section content
        return section
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => line.replace(/^\*\*([^*]+)\*\*:?/, '$1:').trim())
            .filter(line => line.length > 0)
            .slice(0, 10) // Limit to first 10 relevant lines
            .join('\n');
    }

    // Generate context prompt for LLM
    buildContextPrompt() {
        const context = this.extractContextSummary();
        const parts = [];

        if (context.company) {
            parts.push(`COMPANY CONTEXT:\n${context.company}`);
        }

        if (context.techStack) {
            parts.push(`TECH STACK:\n${context.techStack}`);
        }

        if (context.projects) {
            parts.push(`CURRENT PROJECTS:\n${context.projects}`);
        }

        if (context.standards) {
            parts.push(`DEVELOPMENT STANDARDS:\n${context.standards}`);
        }

        if (context.commonIssues) {
            parts.push(`COMMON ISSUES:\n${context.commonIssues}`);
        }

        if (parts.length === 0) {
            return '';
        }

        return `
COMPANY & PROJECT CONTEXT:
${parts.join('\n\n')}

Use this context to make the ticket more relevant to our specific environment, tech stack, and development practices. Reference appropriate technologies, follow our standards, and consider our common patterns when creating the ticket.

`;
    }

    // Get context statistics
    getContextStats() {
        const fullContext = this.getCompanyContext();
        const sections = this.parseMarkdownSections(fullContext);
        
        return {
            totalSections: Object.keys(sections).length,
            totalCharacters: fullContext.length,
            totalLines: fullContext.split('\n').length,
            sections: Object.keys(sections),
            lastModified: this.getLastModified()
        };
    }

    getLastModified() {
        try {
            if (fs.existsSync(this.contextFile)) {
                const stats = fs.statSync(this.contextFile);
                return stats.mtime;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new ContextService();