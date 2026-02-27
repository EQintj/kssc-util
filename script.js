document.addEventListener('DOMContentLoaded', () => {
    // State
    let teams = [];
    let matches = [];
    let config = {
        type: 'league',
        matchCount: 1,
        tournamentStage: 0
    };

    const teamNames = [
        "레드 섀도우", "블루 타이탄", "네온 고스트", "메가 바이퍼",
        "썬더 스톰", "그레이울프", "피닉스 포스", "사이버 드래곤",
        "알파", "브라보", "찰리", "델타", "에코", "폭스트롯", "골프", "호텔"
    ];

    // DOM Elements
    const setupScreen = document.getElementById('setup-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const teamCountInput = document.getElementById('team-count');
    const teamNamesContainer = document.getElementById('team-names-container');
    const autofillBtn = document.getElementById('autofill-btn');
    const startBtn = document.getElementById('start-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const dashboardContent = document.getElementById('dashboard-content');
    const matchList = document.getElementById('match-list');
    const bracketView = document.getElementById('bracket-view');
    const standingsBody = document.getElementById('standings-body');
    const backBtn = document.getElementById('back-btn');

    // Init Team Inputs
    function updateTeamInputs() {
        const count = parseInt(teamCountInput.value) || 0;
        teamNamesContainer.innerHTML = '<label>팀 이름</label>';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `<input type="text" class="team-name-input" placeholder="Team ${i}" data-index="${i - 1}">`;
            teamNamesContainer.appendChild(div);
        }
    }

    teamCountInput.addEventListener('change', updateTeamInputs);
    updateTeamInputs();

    // Autofill
    autofillBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.team-name-input');
        const suffix = document.getElementById('name-suffix').value.trim();

        if (suffix) {
            // Sequential Mode: 1조, 2조...
            inputs.forEach((input, i) => {
                input.value = `${i + 1}${suffix}`;
            });
        } else {
            // Random Preset Mode
            const shuffled = [...teamNames].sort(() => Math.random() - 0.5);
            inputs.forEach((input, i) => {
                input.value = shuffled[i % shuffled.length];
            });
        }
    });

    // View Toggle
    toggleViewBtn.addEventListener('click', () => {
        dashboardContent.classList.toggle('one-page');
    });

    // Option Selectors
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            const parent = card.parentElement;
            parent.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            if (card.dataset.type) config.type = card.dataset.type;
            if (card.dataset.matches) config.matchCount = parseInt(card.dataset.matches);
        });
    });

    // Round Robin Algorithm
    function generateRoundRobin(teamList) {
        let schedule = [];
        let tempTeams = [...teamList];
        if (tempTeams.length % 2 !== 0) tempTeams.push({ id: -1, name: '부전승', isBye: true });

        const rounds = tempTeams.length - 1;
        const matchesPerRound = tempTeams.length / 2;

        for (let r = 0; r < rounds; r++) {
            for (let m = 0; m < matchesPerRound; m++) {
                const team1 = tempTeams[m];
                const team2 = tempTeams[tempTeams.length - 1 - m];

                if (team1 && team2) {
                    schedule.push({
                        team1, team2,
                        score1: (team1.isBye || team2.isBye) ? 0 : null,
                        score2: (team1.isBye || team2.isBye) ? 0 : null,
                        id: schedule.length,
                        round: r
                    });
                    if (config.matchCount === 2) {
                        schedule.push({
                            team1: team2, team2: team1,
                            score1: (team1.isBye || team2.isBye) ? 0 : null,
                            score2: (team1.isBye || team2.isBye) ? 0 : null,
                            id: schedule.length,
                            round: r
                        });
                    }
                }
            }
            // Rotate
            tempTeams.splice(1, 0, tempTeams.pop());
        }
        return schedule;
    }

    // Tournament Logic (Single Elimination)
    function generateTournament(teamList) {
        let schedule = [];
        let tempTeams = [...teamList];

        const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(tempTeams.length)));
        while (tempTeams.length < nextPowerOf2) {
            tempTeams.push({ id: -1, name: '부전승', isBye: true });
        }

        tempTeams.sort(() => Math.random() - 0.5);

        for (let i = 0; i < tempTeams.length; i += 2) {
            const team1 = tempTeams[i];
            const team2 = tempTeams[i + 1];

            const match = {
                team1, team2,
                score1: team2.isBye ? 1 : (team1.isBye ? 0 : null),
                score2: team2.isBye ? 0 : (team1.isBye ? 1 : null),
                id: schedule.length,
                round: 0
            };
            schedule.push(match);
        }
        config.tournamentStage = 0;
        return schedule;
    }

    // Start Competition
    startBtn.addEventListener('click', () => {
        const nameInputs = document.querySelectorAll('.team-name-input');
        teams = Array.from(nameInputs).map((input, i) => ({
            id: i,
            name: input.value || `Team ${i + 1}`,
            points: 0,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            sf: 0, sa: 0, gd: 0
        }));

        const titleText = `${config.type === 'league' ? '리그전' : '토너먼트'} - 경기 현황`;
        document.getElementById('dashboard-title').textContent = titleText;

        if (config.type === 'league') {
            matches = generateRoundRobin(teams);
            document.getElementById('standings-section').classList.remove('hidden');
            matchList.classList.remove('hidden');
            bracketView.classList.add('hidden');
        } else {
            matches = generateTournament(teams);
            document.getElementById('standings-section').classList.add('hidden');
            matchList.classList.add('hidden');
            bracketView.classList.remove('hidden');
        }

        setupScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        renderMatches();
        if (config.type === 'tournament') renderBracket();
        updateStandings();
        resumeBtn.classList.remove('hidden');
    });

    resumeBtn.addEventListener('click', () => {
        const nameInputs = document.querySelectorAll('.team-name-input');
        nameInputs.forEach((input, i) => {
            if (teams[i]) teams[i].name = input.value || `Team ${i + 1}`;
        });

        const titleText = `${config.type === 'league' ? '리그전' : '토너먼트'} - 경기 현황`;
        document.getElementById('dashboard-title').textContent = titleText;

        setupScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        renderMatches();
        if (config.type === 'tournament') renderBracket();
        updateStandings();
    });

    function renderBracket() {
        bracketView.innerHTML = '';
        const maxRound = Math.max(...matches.map(m => m.round));

        for (let r = 0; r <= maxRound; r++) {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';

            const roundMatches = matches.filter(m => m.round === r);
            roundMatches.forEach(match => {
                const card = document.createElement('div');
                card.className = 'bracket-match';
                card.innerHTML = `
                    <div class="bracket-team ${match.score1 !== null && match.score1 > match.score2 ? 'winner' : ''} ${match.color1 || ''}">
                        <span>${match.team1 ? match.team1.name : 'TBD'}</span>
                        <input type="number" class="score-input bracket-score" style="width: 40px; padding: 2px;"
                            data-match-id="${match.id}" data-team="1" value="${match.score1 !== null ? match.score1 : ''}" 
                            ${(match.team1?.isBye || match.team2?.isBye) ? 'disabled' : ''}>
                        <div class="color-toggle">
                            <div class="color-btn red ${match.color1 === 'is-red' ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color="is-red"></div>
                            <div class="color-btn blue ${match.color1 === 'is-blue' ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color="is-blue"></div>
                            <div class="color-btn none ${!match.color1 ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color=""></div>
                        </div>
                    </div>
                    <div class="bracket-team ${match.score2 !== null && match.score2 > match.score1 ? 'winner' : ''} ${match.color2 || ''}">
                        <span>${match.team2 ? match.team2.name : 'TBD'}</span>
                        <input type="number" class="score-input bracket-score" style="width: 40px; padding: 2px;"
                            data-match-id="${match.id}" data-team="2" value="${match.score2 !== null ? match.score2 : ''}" 
                            ${(match.team1?.isBye || match.team2?.isBye) ? 'disabled' : ''}>
                        <div class="color-toggle">
                            <div class="color-btn red ${match.color2 === 'is-red' ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color="is-red"></div>
                            <div class="color-btn blue ${match.color2 === 'is-blue' ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color="is-blue"></div>
                            <div class="color-btn none ${!match.color2 ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color=""></div>
                        </div>
                    </div>
                `;
                roundDiv.appendChild(card);
            });
            bracketView.appendChild(roundDiv);
        }

        bracketView.querySelectorAll('.score-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const matchId = parseInt(e.target.dataset.matchId);
                const team = e.target.dataset.team;
                const val = e.target.value === '' ? null : parseInt(e.target.value);
                const matchIndex = matches.findIndex(m => m.id === matchId);
                if (team === '1') matches[matchIndex].score1 = val;
                else matches[matchIndex].score2 = val;
                checkTournamentProgress();
            });
        });

        bracketView.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = parseInt(e.target.dataset.matchId);
                const team = e.target.dataset.team;
                const color = e.target.dataset.color;
                const matchIndex = matches.findIndex(m => m.id === matchId);
                if (team === '1') matches[matchIndex].color1 = color;
                else matches[matchIndex].color2 = color;
                renderBracket();
            });
        });
    }

    function renderMatches() {
        matchList.innerHTML = '';
        matches.forEach(match => {
            if (match.team1?.isBye || match.team2?.isBye) return; // Skip bye matches in list view

            const card = document.createElement('div');
            card.className = 'match-card';
            card.innerHTML = `
                <div class="match-header">MATCH #${match.id + 1} (라운드 ${match.round + 1})</div>
                <div class="match-teams">
                    <div class="team-info ${match.color1 || ''}">
                        <span class="team-name">${match.team1?.name || 'TBD'}</span>
                        <input type="number" class="score-input" data-match-id="${match.id}" data-team="1" value="${match.score1 !== null ? match.score1 : ''}" placeholder="0">
                        <div class="color-toggle">
                            <div class="color-btn red ${match.color1 === 'is-red' ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color="is-red"></div>
                            <div class="color-btn blue ${match.color1 === 'is-blue' ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color="is-blue"></div>
                            <div class="color-btn none ${!match.color1 ? 'active' : ''}" data-match-id="${match.id}" data-team="1" data-color=""></div>
                        </div>
                    </div>
                    <div class="vs-badge">VS</div>
                    <div class="team-info ${match.color2 || ''}">
                        <span class="team-name">${match.team2?.name || 'TBD'}</span>
                        <input type="number" class="score-input" data-match-id="${match.id}" data-team="2" value="${match.score2 !== null ? match.score2 : ''}" placeholder="0">
                        <div class="color-toggle">
                            <div class="color-btn red ${match.color2 === 'is-red' ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color="is-red"></div>
                            <div class="color-btn blue ${match.color2 === 'is-blue' ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color="is-blue"></div>
                            <div class="color-btn none ${!match.color2 ? 'active' : ''}" data-match-id="${match.id}" data-team="2" data-color=""></div>
                        </div>
                    </div>
                </div>
            `;
            matchList.appendChild(card);
        });

        document.querySelectorAll('.score-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const matchId = parseInt(e.target.dataset.matchId);
                const team = e.target.dataset.team;
                const val = e.target.value === '' ? null : parseInt(e.target.value);
                const matchIndex = matches.findIndex(m => m.id === matchId);
                if (team === '1') matches[matchIndex].score1 = val;
                else matches[matchIndex].score2 = val;

                if (config.type === 'league') updateStandings();
                else checkTournamentProgress();
            });
        });

        matchList.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = parseInt(e.target.dataset.matchId);
                const team = e.target.dataset.team;
                const color = e.target.dataset.color;
                const matchIndex = matches.findIndex(m => m.id === matchId);
                if (team === '1') matches[matchIndex].color1 = color;
                else matches[matchIndex].color2 = color;
                renderMatches();
            });
        });
    }

    function checkTournamentProgress() {
        const currentRoundMatches = matches.filter(m => m.round === config.tournamentStage);
        const allFinished = currentRoundMatches.every(m => m.score1 !== null && m.score2 !== null);

        if (allFinished) {
            const winners = currentRoundMatches.map(m => {
                if (m.score1 > m.score2) return m.team1;
                if (m.score2 > m.score1) return m.team2;
                return m.team1; // Default
            });

            if (winners.length > 1) {
                if (confirm('다음 라운드 진학하시겠습니까?')) {
                    config.tournamentStage++;
                    const nextMatches = [];
                    for (let i = 0; i < winners.length; i += 2) {
                        nextMatches.push({
                            team1: winners[i],
                            team2: winners[i + 1] || { id: -1, name: '부전승', isBye: true },
                            score1: winners[i + 1] ? null : 1,
                            score2: winners[i + 1] ? null : 0,
                            id: matches.length + nextMatches.length,
                            round: config.tournamentStage
                        });
                    }
                    matches = [...matches, ...nextMatches];
                    renderMatches();
                    if (config.type === 'tournament') renderBracket();
                }
            } else if (winners.length === 1) {
                alert(`축하합니다! 우승팀: ${winners[0].name}`);
            }
        }
    }

    function updateStandings() {
        teams.forEach(t => {
            t.points = 0; t.played = 0; t.won = 0; t.drawn = 0; t.lost = 0;
            t.sf = 0; t.sa = 0; t.gd = 0;
        });

        matches.forEach(m => {
            if (m.team1.id === -1 || m.team2.id === -1) return; // Ignore Bye matches in standings
            if (m.score1 !== null && m.score2 !== null) {
                m.team1.played++; m.team2.played++;
                m.team1.sf += m.score1; m.team1.sa += m.score2;
                m.team2.sf += m.score2; m.team2.sa += m.score1;

                if (m.score1 > m.score2) {
                    m.team1.won++; m.team1.points += 3;
                    m.team2.lost++;
                } else if (m.score1 < m.score2) {
                    m.team2.won++; m.team2.points += 3;
                    m.team1.lost++;
                } else {
                    m.team1.drawn++; m.team1.points += 1;
                    m.team2.drawn++; m.team2.points += 1;
                }
            }
        });

        teams.forEach(t => t.gd = t.sf - t.sa);
        const sortedTeams = [...teams].sort((a, b) => b.points - a.points || b.gd - a.gd || b.sf - a.sf);

        standingsBody.innerHTML = '';
        sortedTeams.forEach((t, i) => {
            const tr = document.createElement('tr');
            tr.className = 'team-row';
            tr.innerHTML = `
                <td><span class="rank-text rank-${i + 1}">#${i + 1}</span></td>
                <td><strong>${t.name}</strong></td>
                <td>${t.played}</td>
                <td>${t.won}/${t.drawn}/${t.lost}</td>
                <td>${t.sf}/${t.sa}</td>
                <td><span class="${t.gd > 0 ? 'gd-positive' : (t.gd < 0 ? 'gd-negative' : '')}">${t.gd > 0 ? '+' : ''}${t.gd}</span></td>
                <td><span class="rank-text">${t.points}</span></td>
            `;
            standingsBody.appendChild(tr);
        });
    }

    backBtn.addEventListener('click', () => {
        dashboardScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('모든 기록을 초기화하시겠습니까?')) {
            dashboardScreen.classList.add('hidden');
            setupScreen.classList.remove('hidden');
            resumeBtn.classList.add('hidden');
        }
    });
});
