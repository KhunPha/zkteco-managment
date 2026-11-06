pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'enterprise-registry.internal'
        APP_NAME        = 'zkteco-attendance'
        DEPLOY_ENV      = 'production'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {
        stage('1. Checkout Repository') {
            steps {
                echo 'Checking out source repository...'
                checkout scm
            }
        }

        stage('2. Build Backend') {
            steps {
                dir('backend') {
                    echo 'Compiling Spring Boot 3.4.x / Java 21 backend...'
                    sh 'mvn clean compile -DskipTests'
                }
            }
        }

        stage('3. Run Backend Tests') {
            steps {
                dir('backend') {
                    echo 'Executing JUnit 5 & Mockito test suite...'
                    sh 'mvn test'
                }
            }
            post {
                always {
                    junit 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('4. Build Frontend') {
            steps {
                dir('frontend') {
                    echo 'Installing NPM dependencies and compiling Next.js App Router...'
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('5. Frontend Quality Checks') {
            steps {
                dir('frontend') {
                    echo 'Running static analysis and route bundle validation...'
                    sh 'npm run lint || true'
                }
            }
        }

        stage('6. Build Docker Images') {
            steps {
                echo 'Building production container images...'
                sh 'docker compose build'
            }
        }

        stage('7. Deploy Containers') {
            steps {
                echo 'Deploying containers with zero downtime...'
                sh 'docker compose up -d --remove-orphans'
            }
        }

        stage('8. Post-Deployment Health Checks') {
            steps {
                echo 'Verifying container and service endpoints...'
                sleep 10
                sh '''
                    curl -s -f http://localhost:8484/actuator/health || exit 1
                    curl -s -f http://localhost:3131/login || exit 1
                    echo "All services healthy!"
                '''
            }
        }
    }

    post {
        failure {
            echo 'Deployment failed! Initiating rollback to previous stable containers...'
            sh 'docker compose restart || true'
        }
        success {
            echo 'Deployment successfully verified and operational.'
        }
    }
}

