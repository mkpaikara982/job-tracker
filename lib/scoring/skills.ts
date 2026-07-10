// Canonical tech-skill dictionary for resume-match scoring.
// Each entry: a canonical label + the aliases/spellings that should map to it.
// Matching is case-insensitive and boundary-aware (see extractSkills in score.ts).
// Deliberately curated for Manish's target roles: software/dev/ERP, data/ML, IT support.

export interface SkillDef {
	canonical: string;
	aliases: string[];
	// Optional override of the strings to search for. Use when the canonical label is an
	// ambiguous bare token (e.g. "Go", "C") that would collide with plain English — list
	// only the unambiguous spellings here.
	matchTerms?: string[];
}

export const SKILLS: SkillDef[] = [
	// Languages
	{ canonical: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript"] },
	{ canonical: "TypeScript", aliases: ["typescript", "ts"] },
	{ canonical: "Python", aliases: ["python"] },
	{ canonical: "Java", aliases: ["java"] },
	{ canonical: "C#", aliases: ["c#", "c sharp", "csharp"] },
	{ canonical: "C++", aliases: ["c++", "cpp"] },
	// "C" and "Go" collide with plain English — match only unambiguous spellings.
	{ canonical: "C", aliases: [], matchTerms: ["c language", "ansi c", "c programming"] },
	{ canonical: "Go", aliases: [], matchTerms: ["golang"] },
	{ canonical: "PHP", aliases: ["php"] },
	{ canonical: "Ruby", aliases: ["ruby"] },
	{ canonical: "Kotlin", aliases: ["kotlin"] },
	{ canonical: "Swift", aliases: ["swift"] },
	{ canonical: "Rust", aliases: ["rust"] },
	{ canonical: "SQL", aliases: ["sql"] },
	{ canonical: "HTML", aliases: ["html", "html5"] },
	{ canonical: "CSS", aliases: ["css", "css3"] },
	{ canonical: "Bash", aliases: ["bash", "shell scripting", "shell script"] },
	{ canonical: "PowerShell", aliases: ["powershell"] },
	// Frontend
	{ canonical: "React", aliases: ["react", "react.js", "reactjs"] },
	{ canonical: "Next.js", aliases: ["next.js", "nextjs"] },
	{ canonical: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
	{ canonical: "Angular", aliases: ["angular", "angularjs"] },
	{ canonical: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"] },
	{ canonical: "Redux", aliases: ["redux"] },
	{ canonical: "jQuery", aliases: ["jquery"] },
	{ canonical: "Bootstrap", aliases: ["bootstrap"] },
	// Backend / frameworks
	{ canonical: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
	{ canonical: "Express", aliases: ["express", "express.js", "expressjs"] },
	{ canonical: ".NET", aliases: [".net", "dotnet", "asp.net", "asp net"] },
	{ canonical: "Spring", aliases: ["spring boot", "springboot", "spring framework"] },
	{ canonical: "Django", aliases: ["django"] },
	{ canonical: "Flask", aliases: ["flask"] },
	{ canonical: "FastAPI", aliases: ["fastapi"] },
	{ canonical: "GraphQL", aliases: ["graphql"] },
	{ canonical: "REST API", aliases: ["rest api", "restful", "rest apis", "restful api"] },
	// Data / DB
	{ canonical: "PostgreSQL", aliases: ["postgresql", "postgres"] },
	{ canonical: "MySQL", aliases: ["mysql"] },
	{ canonical: "SQL Server", aliases: ["sql server", "mssql", "t-sql", "tsql"] },
	{ canonical: "SQLite", aliases: ["sqlite"] },
	{ canonical: "MongoDB", aliases: ["mongodb", "mongo"] },
	{ canonical: "Redis", aliases: ["redis"] },
	{ canonical: "Prisma", aliases: ["prisma"] },
	{ canonical: "Firebase", aliases: ["firebase", "firestore"] },
	{ canonical: "Pandas", aliases: ["pandas"] },
	{ canonical: "NumPy", aliases: ["numpy"] },
	{ canonical: "Power BI", aliases: ["power bi", "powerbi"] },
	{ canonical: "Tableau", aliases: ["tableau"] },
	{ canonical: "Excel", aliases: ["excel", "microsoft excel", "advanced excel"] },
	{ canonical: "ETL", aliases: ["etl"] },
	{ canonical: "Data Analysis", aliases: ["data analysis", "data analytics", "data analyst"] },
	// ML / AI
	{ canonical: "Machine Learning", aliases: ["machine learning", "ml"] },
	{ canonical: "Deep Learning", aliases: ["deep learning"] },
	{ canonical: "TensorFlow", aliases: ["tensorflow"] },
	{ canonical: "PyTorch", aliases: ["pytorch"] },
	{ canonical: "scikit-learn", aliases: ["scikit-learn", "sklearn", "scikit learn"] },
	{ canonical: "NLP", aliases: ["nlp", "natural language processing"] },
	// Cloud / DevOps
	{ canonical: "AWS", aliases: ["aws", "amazon web services"] },
	{ canonical: "Azure", aliases: ["azure", "microsoft azure"] },
	{ canonical: "GCP", aliases: ["gcp", "google cloud"] },
	{ canonical: "Docker", aliases: ["docker"] },
	{ canonical: "Kubernetes", aliases: ["kubernetes", "k8s"] },
	{ canonical: "CI/CD", aliases: ["ci/cd", "ci cd", "continuous integration"] },
	{ canonical: "Git", aliases: ["git", "github", "gitlab", "version control"] },
	{ canonical: "Linux", aliases: ["linux", "unix"] },
	{ canonical: "Jenkins", aliases: ["jenkins"] },
	{ canonical: "Terraform", aliases: ["terraform"] },
	// ERP / enterprise
	{ canonical: "ERP", aliases: ["erp", "enterprise resource planning"] },
	{ canonical: "SAP", aliases: ["sap"] },
	{ canonical: "Salesforce", aliases: ["salesforce"] },
	{ canonical: "Dynamics 365", aliases: ["dynamics 365", "dynamics crm", "microsoft dynamics"] },
	// Methods / practices
	{ canonical: "Agile", aliases: ["agile", "scrum", "kanban"] },
	{ canonical: "Testing", aliases: ["unit testing", "jest", "pytest", "test automation", "junit"] },
	{ canonical: "Object-Oriented Programming", aliases: ["oop", "object-oriented", "object oriented"] },
	{ canonical: "API Integration", aliases: ["api integration", "third-party integration"] },
	{ canonical: "Microservices", aliases: ["microservices", "microservice"] },
	// IT support
	{ canonical: "IT Support", aliases: ["it support", "help desk", "helpdesk", "service desk", "desktop support"] },
	{ canonical: "Troubleshooting", aliases: ["troubleshooting", "problem solving", "fault finding"] },
	{ canonical: "Active Directory", aliases: ["active directory"] },
	{ canonical: "Networking", aliases: ["networking", "tcp/ip", "dns", "dhcp"] },
	{ canonical: "Windows", aliases: ["windows server", "microsoft windows", "windows 10", "windows 11"] },
	{ canonical: "Office 365", aliases: ["office 365", "microsoft 365", "o365", "m365"] },
	{ canonical: "ITIL", aliases: ["itil"] },
	{ canonical: "Customer Service", aliases: ["customer service", "customer support"] },
];
