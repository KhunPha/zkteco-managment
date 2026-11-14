/*
 * zkteco-attendance - build, test, scan and deploy to a VPS over SSH (no Docker registry)
 *
 * Jenkins requirements
 *   Plugins     : SSH Agent, Credentials Binding, JUnit, AnsiColor
 *   Credentials : vps-ssh-key        (SSH Username with private key, user = VPS_USER)
 *                 telegram-bot-token (Secret text)   - optional, for notifications
 *                 telegram-chat-id   (Secret text)   - optional, for notifications
 *   Jenkins node: git, mvn, JDK 21, node/npm, docker (+ compose plugin), ssh, scp
 *                 trivy (optional - the image scan is skipped with a warning if missing)
 *
 * VPS requirements (one time)
 *   - docker + docker compose plugin (v2.17+ for "up --wait"), VPS_USER in the "docker" group
 *   - directory VPS_DIR exists and is writable by VPS_USER
 *   - VPS_DIR/.env holds the production secrets (never stored in git or Jenkins)
 *   - docker-compose.yml defines services named like BACKEND_SERVICE / FRONTEND_SERVICE
 *     and (recommended) a "healthcheck:" for each one - see docker-compose.healthcheck.example.yml
 *
 * What is new compared with the basic version
 *   1. Lint problems show as a yellow (UNSTABLE) stage instead of being hidden
 *   2. Image vulnerability scan (Trivy) - CRITICAL findings stop the pipeline
 *   3. Manual approval before production (skip with AUTO_APPROVE)
 *   4. Database backup on the VPS BEFORE the new version starts (keeps the last 7)
 *   5. "docker compose up --wait" waits for the container healthchecks
 *   6. Telegram message on success / failure
 *   7. Old Jenkins builds are discarded automatically
 */

def VPS_SSH_OPTS = '-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15'

/* Send a Telegram message. Never fails the build if the credentials do not exist. */
def notify(String text) {
    try {
        withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                         string(credentialsId: 'telegram-chat-id',   variable: 'TG_CHAT')]) {
            withEnv(["NOTIFY_TEXT=${text}"]) {
                sh '''
                    curl -s -m 10 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                        -d chat_id="${TG_CHAT}" \
                        --data-urlencode "text=${NOTIFY_TEXT}" >/dev/null || true
                '''
            }
        }
    } catch (ignored) {
        echo 'Notification skipped (Telegram credentials not configured).'
    }
}

pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'AUTO_APPROVE',
            defaultValue: false,
            description: 'true = deploy to production without waiting for a manual approval'
        )
    }

    environment {
        APP_NAME         = 'zkteco-attendance'
        DEPLOY_ENV       = 'production'

        // ---- VPS ----
        VPS_HOST         = 'YOUR_VPS_IP_OR_DOMAIN'
        VPS_USER         = 'deploy'
        VPS_PORT         = '22'
        VPS_DIR          = '/opt/zkteco-attendance'
        VPS_SSH_CRED     = 'vps-ssh-key'

        // ---- compose service names ----
        BACKEND_SERVICE  = 'backend'
        FRONTEND_SERVICE = 'frontend'

        // ---- ports used by the health checks (on the VPS) ----
        BACKEND_PORT     = '8484'
        FRONTEND_PORT    = '3131'

        // ---- database backup before every deploy (PostgreSQL in a compose service) ----
        //      set DB_BACKUP to 'false' to skip it; change the 3 values below to yours
        DB_BACKUP        = 'true'
        DB_SERVICE       = 'postgres'
        DB_USER          = 'postgres'
        DB_NAME          = 'attendance'
    }

    // OPTIONS
    //   timeout                : stops a stuck build after 30 minutes (the approval wait
    //                            is limited separately in stage 8)
    //   disableConcurrentBuilds: two deployments can never run at the same time
    //   ansiColor              : colored log output
    //   buildDiscarder         : keeps only the last 20 builds so the disk does not fill up
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        // =====================================================================
        // STAGE 1 - CHECKOUT REPOSITORY
        // Jenkins pulls your code from Git. Then it builds an image tag from the
        // build number + short commit id (example: 42-a1b2c3d). The same tag is
        // used for BOTH Docker images, so you always know which code runs on the
        // VPS. It also sets DEPLOY_STARTED = false (used by the rollback in "post").
        // =====================================================================
        stage('1. Checkout Repository') {
            steps {
                echo 'Checking out source repository...'
                checkout scm

                script {
                    def sha = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    env.IMAGE_TAG        = "${env.BUILD_NUMBER}-${sha}"
                    env.BACKEND_IMAGE    = "${env.APP_NAME}-backend:${env.IMAGE_TAG}"
                    env.FRONTEND_IMAGE   = "${env.APP_NAME}-frontend:${env.IMAGE_TAG}"
                    env.DEPLOY_STARTED   = 'false'
                    echo "Image tag: ${env.IMAGE_TAG}"
                }
            }
        }

        // =====================================================================
        // STAGE 2 - BUILD BACKEND
        // mvn clean compile -DskipTests in backend/. Only checks that the
        // Spring Boot 3.4 / Java 21 code compiles. Tests run in the next stage.
        // =====================================================================
        stage('2. Build Backend') {
            steps {
                dir('backend') {
                    echo 'Compiling Spring Boot 3.4.x / Java 21 backend...'
                    sh 'mvn clean compile -DskipTests'
                }
            }
        }

        // =====================================================================
        // STAGE 3 - RUN BACKEND TESTS
        // mvn test (JUnit 5 + Mockito). Pass or fail, the reports in
        // target/surefire-reports are sent to Jenkins so you can read them.
        // If a test fails the pipeline stops here and nothing is deployed.
        // =====================================================================
        stage('3. Run Backend Tests') {
            steps {
                dir('backend') {
                    echo 'Executing JUnit 5 & Mockito test suite...'
                    sh 'mvn test'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        // =====================================================================
        // STAGE 4 - BUILD FRONTEND
        // npm ci installs the exact versions from package-lock.json, then
        // npm run build compiles the Next.js app. A broken page or a TypeScript
        // error fails the pipeline here.
        // =====================================================================
        stage('4. Build Frontend') {
            steps {
                dir('frontend') {
                    echo 'Installing NPM dependencies and compiling Next.js App Router...'
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        // =====================================================================
        // STAGE 5 - FRONTEND QUALITY CHECKS
        // npm run lint. A lint problem turns THIS stage yellow (UNSTABLE) so you
        // can see it, but the build still continues. To block deployment on lint
        // errors, remove the catchError wrapper.
        // =====================================================================
        stage('5. Frontend Quality Checks') {
            steps {
                dir('frontend') {
                    echo 'Running static analysis and route bundle validation...'
                    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                        sh 'npm run lint'
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 6 - BUILD DOCKER IMAGES
        // 1. Writes docker-compose.deploy.yml: gives the backend and frontend
        //    services a fixed image name + tag.
        // 2. docker compose build builds both images (docker-compose.yml + that
        //    file). Result on the Jenkins machine, for example:
        //      zkteco-attendance-backend:42-a1b2c3d
        //      zkteco-attendance-frontend:42-a1b2c3d
        // =====================================================================
        stage('6. Build Docker Images') {
            steps {
                echo 'Building production container images...'

                writeFile file: 'docker-compose.deploy.yml', text: """\
                    services:
                    ${env.BACKEND_SERVICE}:
                        image: ${env.BACKEND_IMAGE}
                    ${env.FRONTEND_SERVICE}:
                        image: ${env.FRONTEND_IMAGE}
                """

                sh 'docker compose -f docker-compose.yml -f docker-compose.deploy.yml build'
            }
        }

        // =====================================================================
        // STAGE 7 - SCAN IMAGES (Trivy)
        // Looks for known vulnerabilities inside both images. A CRITICAL finding
        // that already has a fix stops the pipeline BEFORE anything reaches the
        // VPS. If trivy is not installed on the Jenkins node, the scan is skipped
        // with a warning (install it with the official Trivy install script).
        // =====================================================================
        stage('7. Scan Images') {
            steps {
                sh '''
                    if command -v trivy >/dev/null 2>&1; then
                        trivy image --exit-code 1 --severity CRITICAL --ignore-unfixed "$BACKEND_IMAGE"
                        trivy image --exit-code 1 --severity CRITICAL --ignore-unfixed "$FRONTEND_IMAGE"
                    else
                        echo "WARNING: trivy is not installed - image scan skipped."
                    fi
                '''
            }
        }

        // =====================================================================
        // STAGE 8 - APPROVE PRODUCTION DEPLOY   (main branch only)
        // The pipeline pauses and waits up to 15 minutes for someone to click
        // "Deploy" in Jenkins. After 15 minutes the build is aborted and the VPS
        // is not touched. Tick AUTO_APPROVE to skip this stage.
        // (disableConcurrentBuilds means a waiting build blocks the next one.)
        // =====================================================================
        stage('8. Approve Production Deploy') {
            when {
                allOf {
                    expression { env.BRANCH_NAME == null || env.BRANCH_NAME == 'main' }
                    expression { !params.AUTO_APPROVE }
                }
            }
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    input message: "Deploy ${env.IMAGE_TAG} to ${env.DEPLOY_ENV}?", ok: 'Deploy'
                }
            }
        }

        // =====================================================================
        // STAGE 9 - DEPLOY TO VPS   (main branch only)
        // 1. Copies docker-compose.yml + the tag file to the VPS folder.
        // 2. Sends both images with: docker save | gzip | ssh | docker load
        //    (no registry needed).
        // 3. Backs up the database on the VPS (skipped on the very first deploy
        //    or when DB_BACKUP = 'false'). If the backup FAILS, the deploy stops
        //    and the running version is left untouched. Keeps the last 7 backups
        //    in VPS_DIR/backups.
        // 4. Sets DEPLOY_STARTED = true, then runs a script ON the VPS:
        //      - saves the current tag file as docker-compose.deploy.previous.yml
        //        (used by the rollback)
        //      - docker compose up -d --no-build --remove-orphans --wait
        //        (starts the new containers and waits for their healthchecks)
        //      - deletes old images, keeping the 3 newest of each service
        // =====================================================================
        stage('9. Deploy To VPS') {
            when {
                expression { env.BRANCH_NAME == null || env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Deploying ${env.IMAGE_TAG} to ${env.VPS_HOST} (${env.DEPLOY_ENV})..."

                writeFile file: 'backup.remote.sh', text: '''#!/usr/bin/env bash
                    set -euo pipefail
                    cd "$1"
                    mkdir -p backups

                    # Only back up when the database container is already running (not on the first deploy)
                    if ! docker compose -f docker-compose.yml ps --status running --services 2>/dev/null | grep -qx "$2"; then
                        echo "Database service '$2' is not running - backup skipped."
                        exit 0
                    fi

                    FILE="backups/db_$(date +%Y%m%d_%H%M%S).sql.gz"
                    if docker compose -f docker-compose.yml exec -T "$2" pg_dump -U "$3" "$4" | gzip > "$FILE"; then
                        echo "Backup saved: $FILE"
                    else
                        rm -f "$FILE"
                        echo "Database backup FAILED."
                        exit 1
                    fi

                    # keep the 7 newest backups
                    ls -1t backups/db_*.sql.gz | tail -n +8 | xargs -r rm -f
                '''

                writeFile file: 'deploy.remote.sh', text: '''#!/usr/bin/env bash
                    set -euo pipefail
                    cd "$1"

                    COMPOSE="docker compose -f docker-compose.yml -f docker-compose.deploy.yml"

                    if [ -f docker-compose.deploy.yml ]; then
                        cp docker-compose.deploy.yml docker-compose.deploy.previous.yml
                    fi
                    mv docker-compose.deploy.yml.new docker-compose.deploy.yml

                    $COMPOSE up -d --no-build --remove-orphans --wait --wait-timeout 180

                    docker image prune -f >/dev/null
                    for repo in "$2-backend" "$2-frontend"; do
                        docker images --format '{{.Repository}}:{{.Tag}}' "$repo" | tail -n +4 | xargs -r docker rmi >/dev/null 2>&1 || true
                    done

                    echo "Deployed."
                '''

                sshagent(credentials: [env.VPS_SSH_CRED]) {
                    script {
                        def target = "${env.VPS_USER}@${env.VPS_HOST}"
                        def ssh    = "ssh -p ${env.VPS_PORT} ${VPS_SSH_OPTS}"
                        def scp    = "scp -P ${env.VPS_PORT} ${VPS_SSH_OPTS}"

                        // 1. compose files
                        sh "${ssh} ${target} 'mkdir -p ${env.VPS_DIR}'"
                        sh "${scp} docker-compose.yml ${target}:${env.VPS_DIR}/docker-compose.yml"
                        sh "${scp} docker-compose.deploy.yml ${target}:${env.VPS_DIR}/docker-compose.deploy.yml.new"

                        // 2. images: stream them straight into docker on the VPS
                        sh """
                            docker save ${env.BACKEND_IMAGE} ${env.FRONTEND_IMAGE} | gzip \
                                | ${ssh} ${target} 'gunzip | docker load'
                        """

                        // 3. database backup (a failed backup stops the deploy here)
                        if (env.DB_BACKUP == 'true') {
                            sh "${ssh} ${target} 'bash -s' -- '${env.VPS_DIR}' '${env.DB_SERVICE}' '${env.DB_USER}' '${env.DB_NAME}' < backup.remote.sh"
                        }

                        // 4. switch containers
                        env.DEPLOY_STARTED = 'true'
                        sh "${ssh} ${target} 'bash -s' -- '${env.VPS_DIR}' '${env.APP_NAME}' < deploy.remote.sh"
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 10 - POST-DEPLOYMENT HEALTH CHECKS   (main branch only)
        // Runs ON the VPS. Every 5 seconds, up to 36 times (3 minutes), it calls
        //   http://localhost:8484/actuator/health   (backend)
        //   http://localhost:3131/login             (frontend)
        // Both must answer successfully. If not, the stage fails and the
        // rollback in "post" runs.
        // =====================================================================
        stage('10. Post-Deployment Health Checks') {
            when {
                expression { env.BRANCH_NAME == null || env.BRANCH_NAME == 'main' }
            }
            steps {
                echo 'Verifying services on the VPS (retries for up to 3 minutes)...'

                writeFile file: 'health.remote.sh', text: '''#!/usr/bin/env bash
                    for i in $(seq 1 36); do
                        if curl -fsS "http://localhost:$1/actuator/health" >/dev/null \
                        && curl -fsS "http://localhost:$2/login" >/dev/null; then
                            echo "All services healthy!"
                            exit 0
                        fi
                        echo "Waiting for services... ($i/36)"
                        sleep 5
                    done
                    echo "Health check failed."
                    exit 1
                '''

                sshagent(credentials: [env.VPS_SSH_CRED]) {
                    sh "ssh -p ${env.VPS_PORT} ${VPS_SSH_OPTS} ${env.VPS_USER}@${env.VPS_HOST} " +
                       "'bash -s' -- '${env.BACKEND_PORT}' '${env.FRONTEND_PORT}' < health.remote.sh"
                }
            }
        }
    }

    // =========================================================================
    // POST ACTIONS (run after all stages)
    //   failure : if DEPLOY_STARTED = true -> restore docker-compose.deploy.previous.yml
    //             on the VPS and start the previous version (nothing to roll back on
    //             the very first deployment). If the build failed BEFORE the switch,
    //             the VPS still runs the old version, so nothing is rolled back.
    //             A Telegram message is sent either way.
    //             NOTE: the rollback restores the CODE only. The database backup in
    //             VPS_DIR/backups is there if a migration also has to be undone.
    //   success : sends a Telegram message.
    //   always  : deletes the temporary script files from the Jenkins workspace.
    // =========================================================================
    post {
        failure {
            script {
                if (env.DEPLOY_STARTED == 'true') {
                    echo 'Deployment failed! Rolling back to the previous stable version on the VPS...'

                    writeFile file: 'rollback.remote.sh', text: '''#!/usr/bin/env bash
                        set -e
                        cd "$1"
                        if [ -f docker-compose.deploy.previous.yml ]; then
                            cp docker-compose.deploy.previous.yml docker-compose.deploy.yml
                            docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --no-build --remove-orphans
                            echo "Rolled back to the previous version."
                        else
                            echo "No previous version found (first deployment). Nothing to roll back."
                        fi
                    '''

                    sshagent(credentials: [env.VPS_SSH_CRED]) {
                        sh "ssh -p ${env.VPS_PORT} ${VPS_SSH_OPTS} ${env.VPS_USER}@${env.VPS_HOST} " +
                           "'bash -s' -- '${env.VPS_DIR}' < rollback.remote.sh || true"
                    }

                    notify("FAILED ${env.APP_NAME} ${env.IMAGE_TAG} - deploy failed, rolled back. ${env.BUILD_URL}")
                } else {
                    echo 'Build failed before the switch. The VPS still runs the previous version.'
                    notify("FAILED ${env.APP_NAME} ${env.IMAGE_TAG} - build stopped before deploy. ${env.BUILD_URL}")
                }
            }
        }
        success {
            echo "Deployment ${env.IMAGE_TAG} successfully verified and operational."
            script {
                if (env.BRANCH_NAME == null || env.BRANCH_NAME == 'main') {
                    notify("SUCCESS ${env.APP_NAME} ${env.IMAGE_TAG} deployed to ${env.DEPLOY_ENV}.")
                }
            }
        }
        always {
            sh 'rm -f backup.remote.sh deploy.remote.sh health.remote.sh rollback.remote.sh docker-compose.deploy.yml || true'
        }
    }
}