(function () {
    console.log('Matrícula Bot: Iniciado');

    let config = {
        subjects: [],
        isActive: false,
        refreshCount: 0
    };

    // Load configuration
    chrome.storage.local.get(['subjects', 'isActive', 'refreshCount'], (result) => {
        config.subjects = result.subjects || [];
        config.isActive = result.isActive || false;
        config.refreshCount = result.refreshCount || 0;

        console.log('Matrícula Bot: Configuração carregada', config);

        // Check for login page
        if (window.location.href.includes('/login') || window.location.href === 'https://matricula.ufabc.edu.br/' || window.location.href === 'https://matricula.ufabc.edu.br') {
            handleLogin();
            return;
        }

        // Check for summary page
        if (window.location.href.includes('/matricula/resumo')) {
            handleSummaryPage();
            return;
        }

        if (config.isActive) {
            runRoutine();
        } else {
            console.log('Matrícula Bot: Bot está desativado. Aguardando ativação...');
        }
    });

    function handleLogin() {
        console.log('Matrícula Bot: Página de login detectada. Iniciando auto-login...');

        const userField = document.getElementById('uid');
        const passField = document.getElementById('senha');
        const loginBtn = document.querySelector('input[name="commit"][type="submit"]');

        if (userField && passField && loginBtn) {
            userField.value = '';
            passField.value = '';

            console.log('Matrícula Bot: Credenciais preenchidas. Aguardando 10 segundos para captcha...');

            setTimeout(() => {
                console.log('Matrícula Bot: Clicando em Entrar!');
                loginBtn.click();
            }, 10000);
        } else {
            console.log('Matrícula Bot: Campos de login não encontrados.');
        }
    }

    function handleSummaryPage() {
        console.log('Matrícula Bot: Página de resumo detectada. Retornando para matrícula...');
        const alterLink = document.querySelector('a[href="/matricula"]');
        if (alterLink) {
            setTimeout(() => {
                console.log('Matrícula Bot: Clicando em ALTERAR...');
                alterLink.click();
            }, 3000); // Small delay to ensure page is ready
        } else {
            console.log('Matrícula Bot: Link "ALTERAR" não encontrado.');
        }
    }

    // Listen for activation from popup
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.isActive) {
            config.isActive = changes.isActive.newValue;
            console.log('Matrícula Bot: Status alterado para', config.isActive);
            if (config.isActive) {
                runRoutine();
            }
        }
        if (changes.subjects) {
            config.subjects = changes.subjects.newValue;
            console.log('Matrícula Bot: Lista de matérias atualizada', config.subjects);
        }
    });

    function runRoutine() {
        console.log(`Matrícula Bot: Executando rotina (Refresh #${config.refreshCount})`);

        if (!config.isActive) return;

        const foundSubject = checkVacancies();

        if (foundSubject) {
            console.log(`Matrícula Bot: VAGA ENCONTRADA para ${foundSubject.name}! Iniciando matrícula...`);
            performEnrollment(foundSubject);
        } else {
            console.log('Matrícula Bot: Nenhuma vaga encontrada nesta rodada.');
            scheduleRefresh();
        }
    }

    function checkVacancies() {
        const rows = document.querySelectorAll('tr[value]');
        console.log(`Matrícula Bot: Analisando ${rows.length} linhas na tabela...`);

        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) continue;

            const subjectName = cells[2]?.innerText.trim();
            if (!subjectName) continue;

            // Check if this subject is in our watch list
            const isWatched = config.subjects.some(watched => subjectName.includes(watched));

            if (isWatched) {
                const totalVacancies = parseInt(cells[3]?.innerText || '0');
                const currentStatus = parseInt(cells[4]?.innerText || '0');
                const checkbox = row.querySelector('input[type="checkbox"]');

                console.log(`Matrícula Bot: Monitorando ${subjectName} -> Status: ${currentStatus}, Total: ${totalVacancies}`);

                if (currentStatus < totalVacancies && checkbox) {
                    return {
                        name: subjectName,
                        checkboxId: checkbox.id
                    };
                }
            }
        }
        return null;
    }

    function performEnrollment(foundSubject) {
        const { checkboxId, name } = foundSubject;

        // Stop the bot and remove the subject from the list
        chrome.storage.local.get(['subjects'], (result) => {
            const currentSubjects = result.subjects || [];
            // Remove the matched subject from the list
            const updatedSubjects = currentSubjects.filter(s => !name.toLowerCase().includes(s.toLowerCase().trim()));

            chrome.storage.local.set({
                isActive: false,
                subjects: updatedSubjects
            }, () => {
                console.log(`Matrícula Bot: "${name}" removida da lista de observação.`);

                const checkbox = document.getElementById(checkboxId);
                const submitBtn = document.getElementById('enviar');

                if (checkbox) {
                    checkbox.checked = true;
                    // Trigger onchange if needed (as per HTML: onchange="verificacao(this)")
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

                    if (submitBtn) {
                        console.log('Matrícula Bot: Clicando em Enviar!');
                        submitBtn.click();
                    } else {
                        alert('Vaga encontrada, mas botão "Enviar" não localizado!');
                    }
                }
            });
        });
    }

    function scheduleRefresh() {
        config.refreshCount++;
        chrome.storage.local.set({ refreshCount: config.refreshCount }, () => {
            let delay;

            if (config.refreshCount % 100 === 0) {
                // Long pause after 100 refreshes
                delay = Math.floor(Math.random() * (25000 - 20000 + 1)) + 20000;
                console.log(`Matrícula Bot: Pausa longa de ${delay / 1000}s após 100 refreshes.`);
            } else {
                // Normal random delay 3-7s
                delay = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
                console.log(`Matrícula Bot: Próximo refresh em ${delay / 1000}s.`);
            }

            setTimeout(() => {
                // Re-check if still active before refreshing
                chrome.storage.local.get(['isActive'], (result) => {
                    if (result.isActive) {
                        window.location.reload();
                    }
                });
            }, delay);
        });
    }
    function handleCaptcha() {
        // 1. Check for Turnstile Script (Evidence of captcha presence)
        const turnstileScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');

        // 2. Check for the main container (on the main page or inside iframe)
        const captchaContainer = document.getElementById('content') || document.querySelector('.cf-turnstile');

        // 3. Check for the checkbox/input to click
        const turnstileCheckbox = document.querySelector('input[type="checkbox"][name="cf-turnstile-response"]') ||
            document.querySelector('#challenge-stage input') ||
            document.querySelector('.ctp-checkbox-label') ||
            document.querySelector('.cf-turnstile input[type="hidden"]'); // Some implementations use a hidden input that gets updated

        if (captchaContainer) {
            console.log('Matrícula Bot: Container do captcha (.cf-turnstile ou #content) ENCONTRADO!');
            const text = captchaContainer.innerText || "";
            if (text.includes('Success')) {
                console.log('Matrícula Bot: Status do captcha -> Sucesso!');
            } else if (text.includes('Verifying')) {
                console.log('Matrícula Bot: Status do captcha -> Verificando...');
            } else if (text.includes('Stuck')) {
                console.log('Matrícula Bot: Status do captcha -> Travado!');
                const stuckLink = document.getElementById('fr-overrun-link');
                if (stuckLink) stuckLink.click();
            }
        }

        if (turnstileCheckbox) {
            console.log('Matrícula Bot: Elemento de interação do captcha ENCONTRADO! Tentando clicar...');
            turnstileCheckbox.click();
        } else if (captchaContainer || window.location.href.includes('/login') || turnstileScript) {
            // Log periodically to help the user debug
            console.log('Matrícula Bot: Monitorando captcha (aguardando elemento de interação aparecer)...');
        }
    }

    // Run captcha check periodically
    setInterval(handleCaptcha, 2000);
})();
