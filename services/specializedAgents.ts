import { Agent, Task, ChatMessage, TaskResult, AgentPerformance } from './types';
import { StorageService } from './StorageService';
import { aiProviderService } from './aiProvider';
import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { semanticMemoryArchitecture } from './semanticMemory';
import { knowledgeGraphSystem as knowledgeGraph } from './knowledgeGraph';
import { contextManagementSystem as contextManager } from './contextManager';

interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  tools: string[];
  config: {
    primaryProvider: string;
    fallbackProviders: string[];
    temperature: number;
    maxTokens: number;
  };
  performance: AgentPerformance;
}

interface AgentExecution {
  agentId: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  result?: TaskResult;
  error?: string;
  metrics: {
    tokensUsed: number;
    processingTime: number;
    memoryUsage: number;
  };
}

interface AgentSpecialization {
  domain: string;
  expertise: string[];
  languages: string[];
  frameworks: string[];
  methodologies: string[];
}

interface AgentLearning {
  agentId: string;
  learningEvents: LearningEvent[];
  performanceHistory: PerformanceMetric[];
  adaptationRules: AdaptationRule[];
  knowledgeBase: string[];
}

interface LearningEvent {
  id: string;
  type: 'success' | 'failure' | 'improvement' | 'feedback';
  description: string;
  timestamp: Date;
  context: Record<string, any>;
  impact: number;
}

interface PerformanceMetric {
  timestamp: Date;
  successRate: number;
  qualityScore: number;
  averageTime: number;
  userRating: number;
  taskComplexity: number;
}

interface AdaptationRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  lastTriggered: Date;
  effectiveness: number;
}

class SpecializedAgentsFactory {
  private agents: Map<string, Agent> = new Map();
  private executions: Map<string, AgentExecution> = new Map();
  private specializations: Map<string, AgentSpecialization> = new Map();
  private learning: Map<string, AgentLearning> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.loadAgents();
    await this.initializeDefaultAgents();
    await this.loadSpecializations();
    await this.loadLearningData();
    this.isInitialized = true;
  }

  private agentTemplates: AgentTemplate[] = [
    {
      id: 'planner',
      name: 'Planner',
      role: 'Architecture & Planning',
      description: 'Designs system architecture and creates development roadmaps',
      capabilities: [
        'system-design', 'architecture', 'planning', 'requirements-analysis',
        'technical-specification', 'roadmap-creation', 'risk-assessment',
        'technology-evaluation', 'resource-planning', 'timeline-estimation'
      ],
      systemPrompt: `You are a senior software architect and technical planner with extensive experience in complex system design. Your expertise includes:

**Core Capabilities:**
1. **System Architecture Design**
   - Create scalable, maintainable system architectures
   - Design microservices, monolithic, and hybrid architectures
   - Evaluate technology stacks and make informed decisions
   - Consider performance, security, and maintainability

2. **Development Planning**
   - Create detailed project roadmaps and timelines
   - Break down complex requirements into manageable tasks
   - Identify dependencies and critical paths
   - Allocate resources effectively

3. **Requirements Analysis**
   - Analyze business and technical requirements
   - Identify gaps and ambiguities
   - Translate requirements into technical specifications
   - Prioritize features based on business value

4. **Risk Assessment**
   - Identify technical and project risks
   - Develop mitigation strategies
   - Create contingency plans
   - Assess impact of potential issues

**Working Style:**
- Think strategically and systematically
- Consider long-term implications of decisions
- Balance technical excellence with practical constraints
- Communicate complex concepts clearly
- Document decisions and rationale

**Output Format:**
Provide structured, actionable plans with clear reasoning. Include:
- Executive summary
- Architecture overview
- Technology recommendations
- Implementation phases
- Risk analysis
- Success criteria

Always justify your recommendations with clear reasoning based on best practices, project requirements, and technical constraints.`,
      tools: ['diagram-generator', 'requirement-analyzer', 'technology-evaluator', 'risk-assessor'],
      config: {
        primaryProvider: 'gemini',
        fallbackProviders: ['openai', 'claude'],
        temperature: 0.3,
        maxTokens: 4096
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.95,
        averageTime: 300,
        qualityScore: 0.92,
        userRating: 0.94
      }
    },
    {
      id: 'coder',
      name: 'Coder',
      role: 'Code Generation',
      description: 'Generates, refactors, and optimizes code across multiple languages',
      capabilities: [
        'code-generation', 'refactoring', 'optimization', 'multiple-languages',
        'debugging', 'testing', 'documentation', 'code-review',
        'pattern-implementation', 'algorithm-design', 'performance-tuning'
      ],
      systemPrompt: `You are an expert software developer with deep knowledge across multiple programming languages and frameworks. Your specialization includes:

**Technical Expertise:**
1. **Multi-Language Proficiency**
   - JavaScript/TypeScript (Node.js, React, React Native)
   - Python (Django, Flask, Data Science)
   - Java (Spring Boot, Android)
   - C# (.NET Core, Azure)
   - Go (Microservices, Cloud Native)
   - Rust (Systems Programming, Performance)

2. **Code Generation & Development**
   - Write clean, efficient, and maintainable code
   - Follow established coding standards and best practices
   - Implement proper error handling and validation
   - Create comprehensive test suites
   - Write clear documentation

3. **Code Refactoring & Optimization**
   - Improve code structure and readability
   - Optimize performance and memory usage
   - Remove code smells and technical debt
   - Apply design patterns appropriately
   - Enhance scalability and maintainability

4. **Development Practices**
   - Test-driven development (TDD)
   - Code review and quality assurance
   - Version control and collaboration
   - Continuous integration and deployment
   - Security best practices

**Working Principles:**
- Write code that is easy to understand and maintain
- Prioritize functionality, performance, and reliability
- Follow established patterns and conventions
- Include appropriate error handling and logging
- Consider edge cases and boundary conditions

**Code Quality Standards:**
- Use meaningful variable and function names
- Keep functions focused and single-purpose
- Write comprehensive comments and documentation
- Include proper error handling and validation
- Follow language-specific best practices

**Output Format:**
Provide well-structured, production-ready code with:
- Clear file organization and structure
- Proper imports and dependencies
- Comprehensive error handling
- Appropriate comments and documentation
- Test cases where relevant
- Performance considerations

Always explain your approach and justify implementation decisions.`,
      tools: ['code-analyzer', 'syntax-checker', 'performance-profiler', 'test-generator'],
      config: {
        primaryProvider: 'openai',
        fallbackProviders: ['claude', 'gemini'],
        temperature: 0.2,
        maxTokens: 8192
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.89,
        averageTime: 180,
        qualityScore: 0.91,
        userRating: 0.87
      }
    },
    {
      id: 'designer',
      name: 'Designer',
      role: 'UI/UX Design',
      description: 'Creates beautiful interfaces and user experience flows',
      capabilities: [
        'ui-design', 'ux-research', 'prototyping', 'accessibility',
        'user-testing', 'interaction-design', 'visual-design', 'design-systems',
        'responsive-design', 'mobile-first', 'usability-heuristics'
      ],
      systemPrompt: `You are a senior UI/UX designer with expertise in creating beautiful, functional, and accessible digital experiences. Your specialization includes:

**Design Expertise:**
1. **User Interface Design**
   - Create visually appealing and intuitive interfaces
   - Design responsive layouts for all screen sizes
   - Establish consistent design systems and style guides
   - Apply color theory, typography, and visual hierarchy
   - Create engaging micro-interactions and animations

2. **User Experience Design**
   - Conduct user research and persona development
   - Create user flows and journey maps
   - Design for accessibility and inclusivity
   - Apply usability heuristics and best practices
   - Conduct usability testing and iteration

3. **Interaction Design**
   - Design intuitive navigation and information architecture
   - Create meaningful interactions and feedback
   - Design for touch, keyboard, and accessibility
   - Optimize user flows and conversion paths
   - Reduce cognitive load and decision fatigue

4. **Design Systems & Components**
   - Create scalable design systems and component libraries
   - Design reusable UI components and patterns
   - Establish design tokens and style guidelines
   - Document design decisions and rationale
   - Ensure consistency across platforms and devices

**Design Philosophy:**
- User-centered design approach
- Accessibility as a core requirement
- Mobile-first responsive design
- Performance-optimized interfaces
- Inclusive and accessible design practices

**Design Principles:**
- Clarity and simplicity
- Consistency and predictability
- Feedback and response
- Efficiency and performance
- Accessibility and inclusivity

**Working Process:**
1. Research and understand user needs
2. Create wireframes and prototypes
3. Design high-fidelity interfaces
4. Test and iterate based on feedback
5. Document and handoff to development

**Output Format:**
Provide comprehensive design deliverables including:
- Design rationale and decisions
- User flows and journey maps
- Wireframes and high-fidelity mockups
- Design specifications and guidelines
- Accessibility considerations
- Interactive prototypes (when applicable)

Always justify design decisions with user research, best practices, and project requirements.`,
      tools: ['design-system-generator', 'accessibility-checker', 'user-flow-creator', 'prototype-builder'],
      config: {
        primaryProvider: 'claude',
        fallbackProviders: ['gemini', 'openai'],
        temperature: 0.7,
        maxTokens: 4096
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.96,
        averageTime: 420,
        qualityScore: 0.94,
        userRating: 0.93
      }
    },
    {
      id: 'debugger',
      name: 'Debugger',
      role: 'Quality Assurance',
      description: 'Identifies bugs, performance issues, and code quality problems',
      capabilities: [
        'bug-detection', 'performance-analysis', 'testing', 'code-review',
        'security-auditing', 'profiling', 'logging', 'monitoring',
        'error-tracking', 'quality-metrics', 'automated-testing'
      ],
      systemPrompt: `You are a senior quality assurance engineer and code reviewer with expertise in identifying and resolving issues across the software development lifecycle. Your specialization includes:

**Quality Assurance Expertise:**
1. **Bug Detection & Analysis**
   - Identify logic errors, edge cases, and potential failures
   - Analyze error logs, stack traces, and debugging information
   - Reproduce and isolate bugs systematically
   - Categorize bugs by severity and impact
   - Provide detailed bug reports with reproduction steps

2. **Code Quality Review**
   - Review code for best practices and standards
   - Identify code smells and technical debt
   - Ensure proper error handling and validation
   - Check for security vulnerabilities
   - Verify code maintainability and readability

3. **Performance Analysis**
   - Identify performance bottlenecks and optimization opportunities
   - Analyze memory usage, CPU utilization, and response times
   - Profile code execution and identify hotspots
   - Recommend performance improvements
   - Monitor application performance metrics

4. **Testing Strategy**
   - Design comprehensive test suites and scenarios
   - Implement unit, integration, and end-to-end tests
   - Recommend testing frameworks and tools
   - Create automated testing pipelines
   - Establish quality metrics and thresholds

**Security Focus:**
- Identify security vulnerabilities and risks
- Review code for common security issues
- Recommend security best practices
- Ensure data protection and privacy
- Validate input sanitization and output encoding

**Testing Methodologies:**
- Test-driven development (TDD)
- Behavior-driven development (BDD)
- Acceptance testing
- Performance testing
- Security testing
- Accessibility testing

**Quality Metrics:**
- Code coverage analysis
- Bug density and severity distribution
- Performance benchmarks
- Security vulnerability counts
- User satisfaction metrics

**Working Approach:**
- Systematic and methodical analysis
- Data-driven decision making
- Comprehensive documentation
- Collaborative problem-solving
- Continuous improvement focus

**Output Format:**
Provide detailed analysis and recommendations including:
- Issue identification and categorization
- Root cause analysis
- Specific actionable recommendations
- Code examples and fixes
- Testing strategies and validation steps
- Prevention measures for future issues

Always provide clear, actionable feedback with specific examples and improvement suggestions.`,
      tools: ['static-analyzer', 'vulnerability-scanner', 'performance-monitor', 'test-runner'],
      config: {
        primaryProvider: 'openai',
        fallbackProviders: ['gemini', 'claude'],
        temperature: 0.1,
        maxTokens: 6144
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.87,
        averageTime: 240,
        qualityScore: 0.88,
        userRating: 0.85
      }
    },
    {
      id: 'devops',
      name: 'DevOps',
      role: 'Deployment & CI/CD',
      description: 'Handles deployment, infrastructure, and continuous integration',
      capabilities: [
        'deployment', 'ci-cd', 'infrastructure', 'monitoring',
        'containerization', 'orchestration', 'cloud-services', 'automation',
        'security', 'scalability', 'reliability', 'disaster-recovery'
      ],
      systemPrompt: `You are a senior DevOps engineer with expertise in cloud infrastructure, deployment automation, and system reliability. Your specialization includes:

**DevOps Expertise:**
1. **Deployment & CI/CD**
   - Design and implement automated deployment pipelines
   - Configure continuous integration and delivery workflows
   - Manage release processes and rollback strategies
   - Implement blue-green and canary deployments
   - Ensure zero-downtime deployments

2. **Infrastructure Management**
   - Design scalable cloud architectures
   - Manage containerization with Docker and Kubernetes
   - Implement infrastructure as code (IaC)
   - Configure cloud services and resources
   - Optimize infrastructure costs and performance

3. **Monitoring & Observability**
   - Implement comprehensive monitoring solutions
   - Set up logging and log aggregation
   - Configure alerting and notification systems
   - Create dashboards and metrics visualization
   - Monitor application performance and health

4. **Security & Compliance**
   - Implement security best practices
   - Configure network security and firewalls
   - Manage access control and authentication
   - Ensure compliance with industry standards
   - Conduct security audits and vulnerability assessments

**Cloud Platforms:**
- AWS (EC2, S3, RDS, Lambda, CloudFormation)
- Azure (VMs, App Services, Functions, ARM Templates)
- Google Cloud (Compute Engine, Cloud Functions, GKE)
- Multi-cloud and hybrid cloud strategies

**Container Technologies:**
- Docker containerization and optimization
- Kubernetes orchestration and management
- Service meshes (Istio, Linkerd)
- Container registry and image management
- Microservices architecture patterns

**Infrastructure as Code:**
- Terraform for multi-cloud infrastructure
- Ansible for configuration management
- CloudFormation for AWS resources
- ARM templates for Azure resources
- Helm charts for Kubernetes applications

**Monitoring & Observability:**
- Prometheus and Grafana for metrics
- ELK stack for logging (Elasticsearch, Logstash, Kibana)
- Jaeger or Zipkin for distributed tracing
- New Relic or Datadog for APM
- Custom monitoring solutions

**Security Practices:**
- Identity and Access Management (IAM)
- Network security groups and firewalls
- SSL/TLS certificate management
- Secret management and rotation
- Security scanning and vulnerability assessment

**Reliability & Scalability:**
- High availability and fault tolerance
- Auto-scaling and load balancing
- Disaster recovery and backup strategies
- Performance optimization and tuning
- Capacity planning and resource management

**Working Approach:**
- Automation-first mindset
- Infrastructure as code principles
- Security by design
- Monitoring and observability focus
- Continuous improvement and optimization

**Output Format:**
Provide comprehensive DevOps solutions including:
- Architecture diagrams and infrastructure designs
- CI/CD pipeline configurations
- Deployment scripts and automation
- Monitoring and alerting setups
- Security configurations and best practices
- Cost optimization recommendations
- Disaster recovery plans

Always include implementation details, configuration files, and step-by-step deployment guides.`,
      tools: ['deployment-manager', 'monitoring-setup', 'security-scanner', 'infrastructure-provisioner'],
      config: {
        primaryProvider: 'gemini',
        fallbackProviders: ['openai', 'claude'],
        temperature: 0.2,
        maxTokens: 4096
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.91,
        averageTime: 360,
        qualityScore: 0.89,
        userRating: 0.88
      }
    },
    {
      id: 'qa',
      name: 'QA Engineer',
      role: 'Quality Assurance',
      description: 'Ensures software quality through comprehensive testing and quality processes',
      capabilities: [
        'testing', 'quality-assurance', 'test-automation', 'quality-metrics',
        'user-acceptance', 'regression-testing', 'performance-testing', 'security-testing',
        'accessibility-testing', 'compatibility-testing', 'usability-testing'
      ],
      systemPrompt: `You are a senior QA Engineer with expertise in comprehensive software quality assurance and testing methodologies. Your specialization includes:

**QA Expertise:**
1. **Test Strategy & Planning**
   - Develop comprehensive test strategies and plans
   - Define test scope, objectives, and success criteria
   - Identify test types and coverage requirements
   - Estimate test effort and resource needs
   - Create test schedules and milestones

2. **Test Automation**
   - Design and implement automated test suites
   - Select appropriate testing frameworks and tools
   - Create maintainable and reusable test scripts
   - Integrate automated tests into CI/CD pipelines
   - Implement continuous testing practices

3. **Manual Testing**
   - Conduct exploratory testing sessions
   - Perform user acceptance testing (UAT)
   - Execute usability and accessibility testing
   - Validate business requirements and user stories
   - Document test cases and test results

4. **Performance & Security Testing**
   - Design and execute performance test scenarios
   - Analyze performance metrics and bottlenecks
   - Conduct security testing and vulnerability assessments
   - Validate application under load and stress conditions
   - Ensure scalability and reliability requirements

**Testing Types:**
- Unit Testing (Component-level testing)
- Integration Testing (Interface testing)
- System Testing (End-to-end testing)
- Acceptance Testing (Business requirement validation)
- Regression Testing (Prevent defects in existing functionality)
- Performance Testing (Speed, scalability, stability)
- Security Testing (Vulnerability assessment)
- Usability Testing (User experience validation)
- Compatibility Testing (Cross-platform validation)
- Accessibility Testing (WCAG compliance)

**Testing Tools & Frameworks:**
- Unit Testing: Jest, Mocha, Jasmine, PyTest, JUnit
- Integration Testing: Postman, RestAssured, Cypress
- E2E Testing: Selenium, Playwright, Puppeteer
- Performance Testing: JMeter, LoadRunner, k6
- Mobile Testing: Appium, XCTest, Espresso
- API Testing: Postman, SoapUI, RestAssured

**Quality Metrics:**
- Test coverage analysis (code, branch, path coverage)
- Defect density and removal efficiency
- Test execution time and pass/fail rates
- Mean time to detection (MTTD)
- Mean time to resolution (MTTR)
- Customer satisfaction scores

**Quality Processes:**
- Test-driven development (TDD)
- Behavior-driven development (BDD)
- Acceptance test-driven development (ATDD)
- Continuous testing and integration
- Shift-left testing approach
- Quality gates and checkpoints

**Risk Management:**
- Identify quality risks and mitigation strategies
- Prioritize testing based on risk assessment
- Implement risk-based testing approaches
- Conduct failure mode and effects analysis (FMEA)
- Develop contingency plans for quality issues

**Working Approach:**
- Systematic and methodical testing approach
- Risk-based prioritization of test activities
- Data-driven decision making
- Continuous improvement of testing processes
- Collaborative approach with development teams

**Documentation & Reporting:**
- Create comprehensive test plans and cases
- Document test results and defect reports
- Generate quality metrics and dashboards
- Provide test summary and recommendations
- Maintain test artifacts and traceability

**Output Format:**
Provide comprehensive QA deliverables including:
- Test strategy and planning documents
- Test cases and test scenarios
- Test automation scripts and frameworks
- Test execution reports and results
- Defect reports and tracking
- Quality metrics and analysis
- Recommendations for quality improvements

Always ensure thorough test coverage and provide actionable insights for quality improvement.`,
      tools: ['test-automation-framework', 'quality-metrics-analyzer', 'defect-tracker', 'test-coverage-analyzer'],
      config: {
        primaryProvider: 'claude',
        fallbackProviders: ['openai', 'gemini'],
        temperature: 0.3,
        maxTokens: 6144
      },
      performance: {
        tasksCompleted: 0,
        successRate: 0.93,
        averageTime: 300,
        qualityScore: 0.95,
        userRating: 0.92
      }
    }
  ];


  private async loadAgents(): Promise<void> {
    try {
      // const agents = await StorageService.getAllAgents();
      // for (const agent of agents) {
      //   this.agents.set(agent.id, agent);
      // }
      const agents = await StorageService.getAllAgents();
      console.log(`Loaded ${agents.length} existing agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  private async initializeDefaultAgents(): Promise<void> {
    console.log('Initializing default specialized agents...');
    
    for (const template of this.agentTemplates) {
      const agent: Agent = {
        id: template.id,
        name: template.name,
        role: template.role,
        description: template.description,
        capabilities: [...template.capabilities],
        isActive: true,
        status: 'idle',
        performance: { ...template.performance },
        config: { ...template.config, systemPrompt: template.systemPrompt, tools: template.tools }
      };

      this.agents.set(agent.id, agent);
      // await StorageService.addAgent(agent);
      
      // Initialize specialization
      await this.initializeAgentSpecialization(agent.id, template);
      
      // Initialize learning
      await this.initializeAgentLearning(agent.id);
    }
    
    console.log(`Initialized ${this.agentTemplates.length} specialized agents`);
  }

  private async initializeAgentSpecialization(agentId: string, template: AgentTemplate): Promise<void> {
    const specialization: AgentSpecialization = {
      domain: template.role,
      expertise: [...template.capabilities],
      languages: this.getAgentLanguages(agentId),
      frameworks: this.getAgentFrameworks(agentId),
      methodologies: this.getAgentMethodologies(agentId)
    };

    this.specializations.set(agentId, specialization);
  }

  private getAgentLanguages(agentId: string): string[] {
    const languageMap: Record<string, string[]> = {
      'coder': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust'],
      'planner': ['English', 'Technical Documentation', 'Architecture Description'],
      'designer': ['Design Systems', 'UI Specifications', 'User Stories'],
      'debugger': ['Multiple Programming Languages', 'Log Formats', 'Error Messages'],
      'devops': ['YAML', 'JSON', 'Shell Scripts', 'Infrastructure Code'],
      'qa': ['Test Scripts', 'Natural Language', 'Bug Reports']
    };

    return languageMap[agentId] || [];
  }

  private getAgentFrameworks(agentId: string): string[] {
    const frameworkMap: Record<string, string[]> = {
      'coder': ['React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Spring', '.NET'],
      'planner': ['Enterprise Architecture', 'Agile', 'Waterfall', 'DevOps'],
      'designer': ['Material Design', 'Ant Design', 'Bootstrap', 'Tailwind CSS'],
      'debugger': ['Testing Frameworks', 'Debugging Tools', 'Profiling Tools'],
      'devops': ['Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins'],
      'qa': ['Selenium', 'Cypress', 'Jest', 'JMeter', 'Postman']
    };

    return frameworkMap[agentId] || [];
  }

  private getAgentMethodologies(agentId: string): string[] {
    const methodologyMap: Record<string, string[]> = {
      'coder': ['TDD', 'BDD', 'Clean Code', 'SOLID', 'Design Patterns'],
      'planner': ['System Design', 'Requirements Analysis', 'Risk Assessment'],
      'designer': ['Design Thinking', 'User-Centered Design', 'Accessibility'],
      'debugger': ['Debugging', 'Performance Analysis', 'Security Testing'],
      'devops': ['CI/CD', 'Infrastructure as Code', 'Site Reliability'],
      'qa': ['Testing Methodologies', 'Quality Assurance', 'Risk-Based Testing']
    };

    return methodologyMap[agentId] || [];
  }

  private async initializeAgentLearning(agentId: string): Promise<void> {
    const learning: AgentLearning = {
      agentId,
      learningEvents: [],
      performanceHistory: [],
      adaptationRules: this.getDefaultAdaptationRules(agentId),
      knowledgeBase: []
    };

    this.learning.set(agentId, learning);
  }

  private getDefaultAdaptationRules(agentId: string): AdaptationRule[] {
    return [
      {
        id: 'performance_improvement',
        condition: 'success_rate < 0.8',
        action: 'adjust_temperature_and_review_prompts',
        priority: 1,
        lastTriggered: new Date(0),
        effectiveness: 0.5
      },
      {
        id: 'quality_enhancement',
        condition: 'quality_score < 0.85',
        action: 'increase_review_iterations',
        priority: 2,
        lastTriggered: new Date(0),
        effectiveness: 0.6
      },
      {
        id: 'efficiency_optimization',
        condition: 'average_time > estimated_time * 1.5',
        action: 'optimize_approach_and_tools',
        priority: 3,
        lastTriggered: new Date(0),
        effectiveness: 0.4
      }
    ];
  }

  private async loadSpecializations(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData();
      // if (data && data.agentSpecializations) {
      //   this.specializations = new Map(data.agentSpecializations);
      //   console.log(`Loaded ${this.specializations.size} agent specializations`);
      // }
    } catch (error) {
      console.error('Failed to load specializations:', error);
    }
  }

  private async loadLearningData(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData();
      // if (data && data.agentLearning) {
      //   this.learning = new Map(data.agentLearning);
      //   console.log(`Loaded ${this.learning.size} agent learning profiles`);
      // }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  }

  async createAgent(templateId: string, customConfig?: Partial<Agent['config']>): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = this.agentTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Agent template ${templateId} not found`);
    }

    const agentId = `${templateId}_${Date.now()}`;
    
    const agent: Agent = {
      id: agentId,
      name: template.name,
      role: template.role,
      description: template.description,
      capabilities: [...template.capabilities],
      isActive: true,
      status: 'idle',
      performance: { ...template.performance },
      config: {
        ...template.config,
        ...customConfig,
        systemPrompt: customConfig?.systemPrompt || template.systemPrompt,
        tools: customConfig?.tools || template.tools
      }
    };

    this.agents.set(agentId, agent);
    // await StorageService.addAgent(agent);

    // Initialize specialization and learning
    await this.initializeAgentSpecialization(agentId, template);
    await this.initializeAgentLearning(agentId);

    return agentId;
  }

  async executeTask(agentId: string, task: Task): Promise<TaskResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Create execution record
    const execution: AgentExecution = {
      agentId,
      taskId: task.id,
      startTime: new Date(),
      status: 'running',
      metrics: {
        tokensUsed: 0,
        processingTime: 0,
        memoryUsage: 0
      }
    };

    this.executions.set(`${agentId}_${task.id}`, execution);

    try {
      // Update agent status
      agent.status = 'working';
      agent.currentTask = task;
      // await StorageService.updateAgent(agent.id, agent);

      // Execute task with enhanced context
      const result = await this.executeEnhancedTask(agent, task, execution);

      // Update execution record
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;

      // Update agent performance
      await this.updateAgentPerformance(agentId, result, execution);

      // Record learning event
      await this.recordLearningEvent(agentId, 'success', `Task completed: ${task.title}`, {
        taskId: task.id,
        result: result.success,
        processingTime: execution.metrics.processingTime
      });

      return result;

    } catch (error) {
      // Update execution record
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      // Update agent status
      agent.status = 'error';
      // await StorageService.updateAgent(agent.id, agent);

      // Record learning event
      await this.recordLearningEvent(agentId, 'failure', `Task failed: ${task.title}`, {
        taskId: task.id,
        error: execution.error,
        processingTime: execution.metrics.processingTime
      });

      throw error;
    }
  }

  private async executeEnhancedTask(agent: Agent, task: Task, execution: AgentExecution): Promise<TaskResult> {
    const startTime = Date.now();

    // Prepare enhanced context
    const context = await this.prepareEnhancedAgentContext(agent, task);

    // Create messages
    const messages: ChatMessage[] = [
      {
        id: `system_${Date.now()}`,
        content: agent.config.systemPrompt,
        role: 'system',
        timestamp: new Date()
      },
      {
        id: `task_${Date.now()}`,
        content: this.formatSpecializedTaskPrompt(agent, task, context),
        role: 'user',
        timestamp: new Date()
      }
    ];

    // Execute with AI provider
    const response = await aiProviderService.sendMessage({
      messages,
      model: agent.config.primaryProvider,
      temperature: agent.config.temperature,
      maxTokens: agent.config.maxTokens
    });

    // Update metrics
    execution.metrics.tokensUsed = response.usage.totalTokens;
    execution.metrics.processingTime = Date.now() - startTime;

    // Create result
    const result: TaskResult = {
      output: response.content,
      files: [],
      success: true,
      metadata: {
        agent: agent.id,
        model: response.model,
        tokens: response.usage.totalTokens,
        processingTime: execution.metrics.processingTime,
        contextUsed: context.length > 0
      }
    };

    // Apply agent-specific post-processing
    return await this.postProcessResult(agent, task, result);
  }

  private async prepareEnhancedAgentContext(agent: Agent, task: Task): Promise<string> {
    let context = '';

    // Get agent specialization context
    const specialization = this.specializations.get(agent.id);
    if (specialization) {
      context += `Agent Specialization:\n`;
      context += `- Domain: ${specialization.domain}\n`;
      context += `- Expertise: ${specialization.expertise.join(', ')}\n`;
      context += `- Languages: ${specialization.languages.join(', ')}\n`;
      context += `- Frameworks: ${specialization.frameworks.join(', ')}\n\n`;
    }

    // Get relevant knowledge from semantic memory
    try {
      const memories = await semanticMemoryArchitecture.retrieveMemories(
        task.description,
        {
          type: 'all',
          limit: 3,
          threshold: 0.5
        }
      );

      if (memories.memories.length > 0) {
        context += 'Relevant Memories:\n';
        for (const memory of memories.memories) {
          context += `- ${memory.content.substring(0, 150)}...\n`;
        }
        context += '\n';
      }
    } catch (error) {
      console.error('Failed to retrieve semantic memories:', error);
    }

    // Get relevant knowledge from knowledge graph
    try {
      const relatedConcepts = await knowledgeGraph.findRelatedConcepts(
        task.id,
        { limit: 3, minWeight: 0.6 }
      );

      if (relatedConcepts.length > 0) {
        context += 'Related Knowledge:\n';
        for (const concept of relatedConcepts) {
          context += `- ${concept.node.content.substring(0, 100)}...\n`;
        }
        context += '\n';
      }
    } catch (error) {
      console.error('Failed to retrieve related concepts:', error);
    }

    // Get project context
    try {
      // const project = await StorageService.getProject(task.projectId);
      // if (project) {
      //   context += `Project Context:\n`;
      //   context += `- Name: ${project.name}\n`;
      //   context += `- Type: ${project.type}\n`;
      //   context += `- Status: ${project.status}\n\n`;
      // }
    } catch (error) {
      console.error('Failed to retrieve project context:', error);
    }

    return context;
  }

  private formatSpecializedTaskPrompt(agent: Agent, task: Task, context: string): string {
    let prompt = `${context}`;

    // Add task-specific formatting based on agent type
    switch (agent.id) {
      case 'planner':
        prompt += this.formatPlannerTaskPrompt(task);
        break;
      case 'coder':
        prompt += this.formatCoderTaskPrompt(task);
        break;
      case 'designer':
        prompt += this.formatDesignerTaskPrompt(task);
        break;
      case 'debugger':
        prompt += this.formatDebuggerTaskPrompt(task);
        break;
      case 'devops':
        prompt += this.formatDevOpsTaskPrompt(task);
        break;
      case 'qa':
        prompt += this.formatQATaskPrompt(task);
        break;
      default:
        prompt += this.formatGenericTaskPrompt(task);
    }

    return prompt;
  }

  private formatPlannerTaskPrompt(task: Task): string {
    return `

**Planning Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**Planning Requirements:**
1. Analyze requirements and identify key components
2. Design system architecture and technical approach
3. Create implementation roadmap with milestones
4. Identify risks and mitigation strategies
5. Provide technology recommendations

**Expected Output:**
Provide a comprehensive plan including:
- Architecture overview and diagrams
- Technology stack recommendations
- Implementation phases and timeline
- Risk assessment and mitigation
- Resource requirements and dependencies`;
  }

  private formatCoderTaskPrompt(task: Task): string {
    return `

**Development Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**Development Requirements:**
1. Write clean, maintainable, and efficient code
2. Follow best practices and coding standards
3. Include proper error handling and validation
4. Add appropriate comments and documentation
5. Consider performance and security implications

**Expected Output:**
Provide production-ready code including:
- Complete implementation with all necessary files
- Proper imports and dependencies
- Error handling and validation
- Test cases (if applicable)
- Documentation and usage examples`;
  }

  private formatDesignerTaskPrompt(task: Task): string {
    return `

**Design Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**Design Requirements:**
1. Create user-centered and accessible designs
2. Follow design system principles and consistency
3. Consider responsive design and mobile-first approach
4. Include interaction patterns and micro-interactions
5. Ensure usability and accessibility standards

**Expected Output:**
Provide comprehensive design deliverables:
- Design rationale and decisions
- Wireframes and high-fidelity mockups
- Design specifications and guidelines
- Interaction patterns and animations
- Accessibility considerations and compliance`;
  }

  private formatDebuggerTaskPrompt(task: Task): string {
    return `

**Debugging Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**Debugging Requirements:**
1. Identify and analyze issues systematically
2. Provide root cause analysis
3. Suggest specific fixes and improvements
4. Include testing and validation steps
5. Document findings and recommendations

**Expected Output:**
Provide detailed analysis including:
- Issue identification and categorization
- Root cause analysis with evidence
- Specific code fixes and improvements
- Testing procedures and validation steps
- Prevention measures and best practices`;
  }

  private formatDevOpsTaskPrompt(task: Task): string {
    return `

**DevOps Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**DevOps Requirements:**
1. Design scalable and reliable infrastructure
2. Implement automation and CI/CD pipelines
3. Ensure security and compliance requirements
4. Include monitoring and observability
5. Provide deployment and rollback strategies

**Expected Output:**
Provide comprehensive DevOps solutions:
- Infrastructure architecture and diagrams
- CI/CD pipeline configurations
- Deployment scripts and automation
- Monitoring and alerting setups
- Security configurations and best practices`;
  }

  private formatQATaskPrompt(task: Task): string {
    return `

**QA Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**QA Requirements:**
1. Develop comprehensive testing strategies
2. Create detailed test cases and scenarios
3. Implement automated testing where possible
4. Include performance and security testing
5. Provide quality metrics and recommendations

**Expected Output:**
Provide thorough QA deliverables:
- Test strategy and planning documents
- Detailed test cases and scenarios
- Automated test scripts and frameworks
- Test execution reports and results
- Quality metrics and improvement recommendations`;
  }

  private formatGenericTaskPrompt(task: Task): string {
    return `

**Task:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}

**Requirements:**
1. Analyze the task requirements carefully
2. Provide a comprehensive solution
3. Consider best practices and standards
4. Include appropriate documentation
5. Ensure quality and maintainability

**Expected Output:**
Provide a complete solution including:
- Analysis and approach
- Detailed implementation
- Testing and validation
- Documentation and guidelines
- Recommendations for next steps`;
  }

  private async postProcessResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Agent-specific post-processing
    switch (agent.id) {
      case 'coder':
        return await this.postProcessCodeResult(agent, task, result);
      case 'designer':
        return await this.postProcessDesignResult(agent, task, result);
      case 'debugger':
        return await this.postProcessDebugResult(agent, task, result);
      case 'devops':
        return await this.postProcessDevOpsResult(agent, task, result);
      case 'qa':
        return await this.postProcessQAResult(agent, task, result);
      default:
        return result;
    }
  }

  private async postProcessCodeResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Extract code blocks and validate syntax
    const codeBlocks = this.extractCodeBlocks(result.output);
    
    // Add code quality metrics
    result.metadata = {
      ...result.metadata,
      codeBlocks: codeBlocks.length,
      languages: this.detectLanguages(codeBlocks),
      estimatedLines: this.estimateLinesOfCode(codeBlocks)
    };

    return result;
  }

  private async postProcessDesignResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Extract design specifications
    const designSpecs = this.extractDesignSpecifications(result.output);
    
    result.metadata = {
      ...result.metadata,
      designComponents: designSpecs.components,
      designPatterns: designSpecs.patterns,
      accessibilityScore: this.assessAccessibility(result.output)
    };

    return result;
  }

  private async postProcessDebugResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Extract issues and fixes
    const issues = this.extractIssues(result.output);
    const fixes = this.extractFixes(result.output);
    
    result.metadata = {
      ...result.metadata,
      issuesFound: issues.length,
      fixesProvided: fixes.length,
      severityDistribution: this.analyzeSeverity(issues)
    };

    return result;
  }

  private async postProcessDevOpsResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Extract infrastructure components
    const components = this.extractInfrastructureComponents(result.output);
    
    result.metadata = {
      ...result.metadata,
      infrastructureComponents: components.length,
      automationLevel: this.assessAutomationLevel(result.output),
      securityMeasures: this.countSecurityMeasures(result.output)
    };

    return result;
  }

  private async postProcessQAResult(agent: Agent, task: Task, result: TaskResult): Promise<TaskResult> {
    // Extract test cases and quality metrics
    const testCases = this.extractTestCases(result.output);
    
    result.metadata = {
      ...result.metadata,
      testCases: testCases.length,
      testTypes: this.identifyTestTypes(testCases),
      coverageEstimate: this.estimateTestCoverage(testCases)
    };

    return result;
  }

  private extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const codeBlocks: Array<{ language: string; code: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'unknown',
        code: match[2].trim()
      });
    }
    
    return codeBlocks;
  }

  private detectLanguages(codeBlocks: Array<{ language: string; code: string }>): string[] {
    return [...new Set(codeBlocks.map(block => block.language))];
  }

  private estimateLinesOfCode(codeBlocks: Array<{ language: string; code: string }>): number {
    return codeBlocks.reduce((total, block) => {
      return total + block.code.split('\n').length;
    }, 0);
  }

  private extractDesignSpecifications(content: string): { components: string[]; patterns: string[] } {
    const components: string[] = [];
    const patterns: string[] = [];
    
    // Simple extraction - in production, this would use more sophisticated NLP
    const componentMatches = content.match(/component[s]?\s*[:\-]?\s*([^\n]+)/gi);
    const patternMatches = content.match(/pattern[s]?\s*[:\-]?\s*([^\n]+)/gi);
    
    if (componentMatches) {
      components.push(...componentMatches.map(match => match.split(/[:\-]/)[1].trim()));
    }
    
    if (patternMatches) {
      patterns.push(...patternMatches.map(match => match.split(/[:\-]/)[1].trim()));
    }
    
    return { components, patterns };
  }

  private assessAccessibility(content: string): number {
    // Simple accessibility assessment
    const accessibilityKeywords = ['accessibility', 'wcag', 'aria', 'screen reader', 'keyboard navigation', 'contrast'];
    const keywordCount = accessibilityKeywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
    
    return Math.min(keywordCount * 0.2, 1.0);
  }

  private extractIssues(content: string): Array<{ description: string; severity: string }> {
    const issues: Array<{ description: string; severity: string }> = [];
    
    // Simple issue extraction
    const issueMatches = content.match(/issue[s]?\s*[:\-]?\s*([^\n]+)/gi);
    const severityMatches = content.match(/severity\s*[:\-]?\s*([^\n]+)/gi);
    
    if (issueMatches && severityMatches) {
      for (let i = 0; i < Math.min(issueMatches.length, severityMatches.length); i++) {
        issues.push({
          description: issueMatches[i].split(/[:\-]/)[1].trim(),
          severity: severityMatches[i].split(/[:\-]/)[1].trim()
        });
      }
    }
    
    return issues;
  }

  private extractFixes(content: string): string[] {
    const fixMatches = content.match(/fix[s]?\s*[:\-]?\s*([^\n]+)/gi);
    return fixMatches ? fixMatches.map(match => match.split(/[:\-]/)[1].trim()) : [];
  }

  private analyzeSeverity(issues: Array<{ description: string; severity: string }>): Record<string, number> {
    const severity: Record<string, number> = {};
    
    for (const issue of issues) {
      const sev = issue.severity.toLowerCase();
      severity[sev] = (severity[sev] || 0) + 1;
    }
    
    return severity;
  }

  private extractInfrastructureComponents(content: string): string[] {
    const componentMatches = content.match(/component[s]?\s*[:\-]?\s*([^\n]+)/gi);
    return componentMatches ? componentMatches.map(match => match.split(/[:\-]/)[1].trim()) : [];
  }

  private assessAutomationLevel(content: string): number {
    const automationKeywords = ['automate', 'automation', 'script', 'pipeline', 'ci/cd', 'continuous'];
    const keywordCount = automationKeywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
    
    return Math.min(keywordCount * 0.25, 1.0);
  }

  private countSecurityMeasures(content: string): number {
    const securityKeywords = ['security', 'authentication', 'authorization', 'encryption', 'firewall', 'ssl'];
    return securityKeywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
  }

  private extractTestCases(content: string): Array<{ description: string; type: string }> {
    const testCases: Array<{ description: string; type: string }> = [];
    
    // Simple test case extraction
    const testCaseMatches = content.match(/test case[s]?\s*[:\-]?\s*([^\n]+)/gi);
    const typeMatches = content.match(/type\s*[:\-]?\s*([^\n]+)/gi);
    
    if (testCaseMatches && typeMatches) {
      for (let i = 0; i < Math.min(testCaseMatches.length, typeMatches.length); i++) {
        testCases.push({
          description: testCaseMatches[i].split(/[:\-]/)[1].trim(),
          type: typeMatches[i].split(/[:\-]/)[1].trim()
        });
      }
    }
    
    return testCases;
  }

  private identifyTestTypes(testCases: Array<{ description: string; type: string }>): string[] {
    return [...new Set(testCases.map(testCase => testCase.type))];
  }

  private estimateTestCoverage(testCases: Array<{ description: string; type: string }>): number {
    // Simple coverage estimation based on test case count and variety
    const typeVariety = new Set(testCases.map(testCase => testCase.type)).size;
    const baseCoverage = Math.min(testCases.length * 0.1, 0.5);
    const varietyBonus = Math.min(typeVariety * 0.1, 0.3);
    
    return Math.min(baseCoverage + varietyBonus, 1.0);
  }

  private async updateAgentPerformance(agentId: string, result: TaskResult, execution: AgentExecution): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Update basic performance metrics
    agent.performance.tasksCompleted++;
    agent.performance.successRate = this.calculateSuccessRate(agent, result.success);
    agent.performance.averageTime = this.updateAverageTime(agent, execution.metrics.processingTime);

    // Calculate quality score based on various factors
    const qualityScore = this.calculateQualityScore(agentId, result, execution);
    agent.performance.qualityScore = qualityScore;

    // Update user rating (simplified)
    agent.performance.userRating = (agent.performance.userRating + qualityScore) / 2;

    // Save agent
    // await StorageService.updateAgent(agent.id, agent);

    // Update performance history
    await this.updatePerformanceHistory(agentId, agent.performance, execution);
  }

  private calculateSuccessRate(agent: Agent, success: boolean): number {
    if (agent.performance.tasksCompleted === 1) {
      return success ? 1.0 : 0.0;
    }
    
    const currentSuccess = success ? 1 : 0;
    return ((agent.performance.successRate * (agent.performance.tasksCompleted - 1)) + currentSuccess) / agent.performance.tasksCompleted;
  }

  private updateAverageTime(agent: Agent, newTime: number): number {
    if (agent.performance.tasksCompleted === 1) {
      return newTime;
    }
    return (agent.performance.averageTime * (agent.performance.tasksCompleted - 1) + newTime) / agent.performance.tasksCompleted;
  }

  private calculateQualityScore(agentId: string, result: TaskResult, execution: AgentExecution): number {
    let score = 0.5; // Base score

    // Success bonus
    if (result.success) {
      score += 0.3;
    }

    // Processing time efficiency
    const expectedTime = 300000; // 5 minutes baseline
    const timeEfficiency = Math.max(0, 1 - (execution.metrics.processingTime / expectedTime));
    score += timeEfficiency * 0.2;

    // Token efficiency
    const tokenEfficiency = Math.max(0, 1 - (execution.metrics.tokensUsed / 4000));
    score += tokenEfficiency * 0.1;

    // Content quality (simplified)
    const contentLength = result.output.length;
    if (contentLength > 100 && contentLength < 10000) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private async updatePerformanceHistory(agentId: string, performance: AgentPerformance, execution: AgentExecution): Promise<void> {
    const learning = this.learning.get(agentId);
    if (!learning) return;

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      successRate: performance.successRate,
      qualityScore: performance.qualityScore,
      averageTime: performance.averageTime,
      userRating: performance.userRating,
      taskComplexity: this.assessTaskComplexity(execution.taskId)
    };

    learning.performanceHistory.push(metric);

    // Keep only recent history
    if (learning.performanceHistory.length > 100) {
      learning.performanceHistory = learning.performanceHistory.slice(-100);
    }
  }

  private assessTaskComplexity(taskId: string): number {
    // Simplified complexity assessment
    return 0.5; // Placeholder
  }

  private async recordLearningEvent(agentId: string, type: 'success' | 'failure' | 'improvement' | 'feedback', description: string, context: Record<string, any>): Promise<void> {
    const learning = this.learning.get(agentId);
    if (!learning) return;

    const event: LearningEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      timestamp: new Date(),
      context,
      impact: this.calculateEventImpact(type, context)
    };

    learning.learningEvents.push(event);

    // Keep only recent events
    if (learning.learningEvents.length > 1000) {
      learning.learningEvents = learning.learningEvents.slice(-1000);
    }

    // Check adaptation rules
    await this.checkAdaptationRules(agentId, learning, event);
  }

  private calculateEventImpact(type: string, context: Record<string, any>): number {
    switch (type) {
      case 'success':
        return context.result ? 0.8 : 0.2;
      case 'failure':
        return -0.5;
      case 'improvement':
        return 0.6;
      case 'feedback':
        return 0.4;
      default:
        return 0.1;
    }
  }

  private async checkAdaptationRules(agentId: string, learning: AgentLearning, event: LearningEvent): Promise<void> {
    for (const rule of learning.adaptationRules) {
      if (this.evaluateRuleCondition(rule.condition, learning, event)) {
        await this.executeAdaptationRule(agentId, rule);
        rule.lastTriggered = new Date();
      }
    }
  }

  private evaluateRuleCondition(condition: string, learning: AgentLearning, event: LearningEvent): boolean {
    // Simplified rule evaluation
    if (condition.includes('success_rate < 0.8')) {
      const recentPerformance = learning.performanceHistory.slice(-10);
      const avgSuccessRate = recentPerformance.reduce((sum, p) => sum + p.successRate, 0) / recentPerformance.length;
      return avgSuccessRate < 0.8;
    }
    
    if (condition.includes('quality_score < 0.85')) {
      const recentPerformance = learning.performanceHistory.slice(-10);
      const avgQuality = recentPerformance.reduce((sum, p) => sum + p.qualityScore, 0) / recentPerformance.length;
      return avgQuality < 0.85;
    }
    
    return false;
  }

  private async executeAdaptationRule(agentId: string, rule: AdaptationRule): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    switch (rule.action) {
      case 'adjust_temperature_and_review_prompts':
        agent.config.temperature = Math.max(0.1, agent.config.temperature - 0.1);
        break;
      case 'increase_review_iterations':
        // This would be implemented in the agent execution logic
        break;
      case 'optimize_approach_and_tools':
        // This would trigger tool optimization
        break;
    }

    // await StorageService.updateAgent(agent.id, agent);
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    return this.agents.get(agentId) || null;
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgentSpecialization(agentId: string): Promise<AgentSpecialization | null> {
    return this.specializations.get(agentId) || null;
  }

  async getAgentLearning(agentId: string): Promise<AgentLearning | null> {
    return this.learning.get(agentId) || null;
  }

  async getAgentExecutionHistory(agentId: string): Promise<AgentExecution[]> {
    return Array.from(this.executions.values())
      .filter(execution => execution.agentId === agentId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async getAgentAnalytics(agentId: string): Promise<{
    performance: AgentPerformance;
    recentExecutions: AgentExecution[];
    learningEvents: LearningEvent[];
    adaptationRules: AdaptationRule[];
  }> {
    const agent = this.agents.get(agentId);
    const specialization = this.specializations.get(agentId);
    const learning = this.learning.get(agentId);

    if (!agent || !learning) {
      throw new Error(`Agent ${agentId} not found or learning data unavailable`);
    }

    const recentExecutions = Array.from(this.executions.values())
      .filter(execution => execution.agentId === agentId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 10);

    return {
      performance: agent.performance,
      recentExecutions,
      learningEvents: learning.learningEvents.slice(-20),
      adaptationRules: learning.adaptationRules
    };
  }

  async updateAgentConfig(agentId: string, config: Partial<Agent['config']>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.config = { ...agent.config, ...config };
    // await StorageService.updateAgent(agent.id, agent);
  }

  async activateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.isActive = true;
    // await StorageService.updateAgent(agent.id, agent);
  }

  async deactivateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.isActive = false;
    agent.status = 'idle';
    // await StorageService.updateAgent(agent.id, agent);
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId);
    this.specializations.delete(agentId);
    this.learning.delete(agentId);
    
    // Remove from storage
    // await StorageService.deleteAgent(agentId);
    
    // Save remaining data
    await this.saveAgentData();
  }

  private async saveAgentData(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData() || {};
      // data.agentSpecializations = Array.from(this.specializations.entries());
      // data.agentLearning = Array.from(this.learning.entries());
      // data.agentExecutions = Array.from(this.executions.entries());
      
      // await StorageService.saveVectorDatabaseData(data);
    } catch (error) {
      console.error('Failed to save agent data:', error);
    }
  }

  async getFactoryAnalytics(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    averageSuccessRate: number;
    averageQualityScore: number;
    learningEvents: number;
  }> {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(agent => agent.isActive).length;
    const totalExecutions = this.executions.size;
    
    const allPerformance = Array.from(this.agents.values()).map(agent => agent.performance);
    const averageSuccessRate = allPerformance.length > 0 
      ? allPerformance.reduce((sum, p) => sum + p.successRate, 0) / allPerformance.length 
      : 0;
    const averageQualityScore = allPerformance.length > 0 
      ? allPerformance.reduce((sum, p) => sum + p.qualityScore, 0) / allPerformance.length 
      : 0;
    
    const learningEvents = Array.from(this.learning.values())
      .reduce((sum, learning) => sum + learning.learningEvents.length, 0);

    return {
      totalAgents,
      activeAgents,
      totalExecutions,
      averageSuccessRate,
      averageQualityScore,
      learningEvents
    };
  }
}

export const specializedAgentsFactory = new SpecializedAgentsFactory();