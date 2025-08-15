#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.metrics = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  async validateBuildArtifacts() {
    this.log('Validating build artifacts...');

    // Check if .next directory exists
    const nextDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(nextDir)) {
      this.addError('Build directory .next does not exist');
      return;
    }

    // Check for critical build files
    const requiredFiles = [
      '.next/BUILD_ID',
      '.next/build-manifest.json',
      '.next/export-marker.json',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        this.addError(`Required build file missing: ${file}`);
      }
    }

    // Validate build manifest
    const manifestPath = path.join(process.cwd(), '.next/build-manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const pageCount = Object.keys(manifest.pages || {}).length;
        this.metrics.pageCount = pageCount;
        this.log(`Build contains ${pageCount} pages`, 'success');
        
        if (pageCount === 0) {
          this.addWarning('No pages found in build manifest');
        }
      } catch (error) {
        this.addError(`Invalid build manifest: ${error.message}`);
      }
    }

    // Check static directory
    const staticDir = path.join(nextDir, 'static');
    if (fs.existsSync(staticDir)) {
      const staticFiles = this.getDirectorySize(staticDir);
      this.metrics.staticSize = staticFiles.size;
      this.metrics.staticFiles = staticFiles.count;
      this.log(`Static assets: ${staticFiles.count} files, ${this.formatBytes(staticFiles.size)}`);
    }

    this.log('Build artifacts validation complete', 'success');
  }

  async validateBundleSize() {
    this.log('Validating bundle size...');

    const bundleDir = path.join(process.cwd(), '.next/static/chunks');
    if (!fs.existsSync(bundleDir)) {
      this.addWarning('Chunk directory not found, skipping bundle size validation');
      return;
    }

    const bundleInfo = this.getDirectorySize(bundleDir);
    this.metrics.bundleSize = bundleInfo.size;
    this.metrics.chunkCount = bundleInfo.count;

    const bundleSizeMB = bundleInfo.size / (1024 * 1024);
    this.log(`Bundle size: ${this.formatBytes(bundleInfo.size)} (${bundleInfo.count} chunks)`);

    // Bundle size thresholds
    const MAX_BUNDLE_SIZE_MB = 5; // 5MB
    const WARN_BUNDLE_SIZE_MB = 3; // 3MB

    if (bundleSizeMB > MAX_BUNDLE_SIZE_MB) {
      this.addError(`Bundle size (${bundleSizeMB.toFixed(2)}MB) exceeds maximum threshold (${MAX_BUNDLE_SIZE_MB}MB)`);
    } else if (bundleSizeMB > WARN_BUNDLE_SIZE_MB) {
      this.addWarning(`Bundle size (${bundleSizeMB.toFixed(2)}MB) approaching threshold (${MAX_BUNDLE_SIZE_MB}MB)`);
    } else {
      this.log(`Bundle size is within acceptable limits`, 'success');
    }
  }

  async validateServerBuild() {
    this.log('Validating server build...');

    const serverDir = path.join(process.cwd(), '.next/server');
    if (!fs.existsSync(serverDir)) {
      this.addError('Server build directory not found');
      return;
    }

    // Check for server chunks
    const serverPagesDir = path.join(serverDir, 'pages');
    const serverAppDir = path.join(serverDir, 'app');
    
    let serverPages = 0;
    if (fs.existsSync(serverPagesDir)) {
      serverPages += this.countFiles(serverPagesDir, '.js');
    }
    if (fs.existsSync(serverAppDir)) {
      serverPages += this.countFiles(serverAppDir, '.js');
    }

    this.metrics.serverPages = serverPages;
    this.log(`Server build contains ${serverPages} page files`, 'success');
  }

  async validateDependencies() {
    this.log('Validating production dependencies...');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});

      this.metrics.prodDependencies = dependencies.length;
      this.metrics.devDependencies = devDependencies.length;

      this.log(`Production dependencies: ${dependencies.length}`);
      this.log(`Development dependencies: ${devDependencies.length}`);

      // Check for security vulnerabilities
      try {
        const { stdout } = await execAsync('npm audit --json --audit-level high');
        const audit = JSON.parse(stdout);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};
        const critical = vulnerabilities.critical || 0;
        const high = vulnerabilities.high || 0;

        if (critical > 0 || high > 0) {
          this.addError(`Found ${critical} critical and ${high} high severity vulnerabilities`);
        } else {
          this.log('No high/critical vulnerabilities found', 'success');
        }
      } catch (auditError) {
        if (auditError.code === 1) {
          this.addError('Security vulnerabilities found in dependencies');
        } else {
          this.addWarning('Could not run security audit');
        }
      }
    } catch (error) {
      this.addError(`Could not validate dependencies: ${error.message}`);
    }
  }

  async validateEnvironmentConfig() {
    this.log('Validating environment configuration...');

    const requiredEnvVars = [
      'NODE_ENV',
      // Add other required environment variables
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.addWarning(`Environment variable ${envVar} is not set`);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      this.log('Production environment configuration detected', 'success');
    } else {
      this.addWarning(`NODE_ENV is set to '${process.env.NODE_ENV}', expected 'production'`);
    }
  }

  async validateDatabase() {
    this.log('Validating database schema...');

    try {
      // Check if Prisma client is generated
      const prismaClientPath = path.join(process.cwd(), 'node_modules/.prisma/client');
      if (!fs.existsSync(prismaClientPath)) {
        this.addError('Prisma client not generated - run "prisma generate"');
        return;
      }

      // Check schema file
      const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      if (!fs.existsSync(schemaPath)) {
        this.addError('Prisma schema file not found');
        return;
      }

      this.log('Database schema validation passed', 'success');
    } catch (error) {
      this.addError(`Database validation failed: ${error.message}`);
    }
  }

  getDirectorySize(dirPath) {
    let size = 0;
    let count = 0;

    const traverse = (currentPath) => {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          traverse(filePath);
        } else {
          size += stat.size;
          count++;
        }
      }
    };

    traverse(dirPath);
    return { size, count };
  }

  countFiles(dirPath, extension = '') {
    let count = 0;
    
    const traverse = (currentPath) => {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          traverse(filePath);
        } else if (!extension || file.endsWith(extension)) {
          count++;
        }
      }
    };

    traverse(dirPath);
    return count;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      metrics: this.metrics,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
      }
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'build-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  async run() {
    this.log('Starting build validation...', 'info');
    
    try {
      await this.validateBuildArtifacts();
      await this.validateBundleSize();
      await this.validateServerBuild();
      await this.validateDependencies();
      await this.validateEnvironmentConfig();
      await this.validateDatabase();
      
      const report = this.generateReport();
      
      if (this.errors.length === 0) {
        this.log('✨ Build validation completed successfully!', 'success');
        this.log(`📊 Report saved to: build-validation-report.json`);
        
        if (this.warnings.length > 0) {
          this.log(`⚠️  ${this.warnings.length} warnings found (see report for details)`);
        }
      } else {
        this.log(`❌ Build validation failed with ${this.errors.length} errors`, 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.addError(`Validation process failed: ${error.message}`);
      this.generateReport();
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new BuildValidator();
  validator.run();
}

module.exports = BuildValidator;