document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - App Initializing');

    // State
    var teams = [];
    var matches = [];
    var config = {
        type: 'league',
        matchCount: 1,
        tournamentStage: 0
    };

    var teamNames = [
        "레드 섀도우", "블루 타이탄", "네온 고스트", "메가 바이퍼",
        "썬더 스톰", "그레이울프", "피닉스 포스", "사이버 드래곤",
        "알파", "브라보", "찰리", "델타", "에코", "폭스트롯", "골프", "호텔"
    ];

    // DOM Elements
    var setupScreen = document.getElementById('setup-screen');
    var dashboardScreen = document.getElementById('dashboard-screen');
    var teamCountInput = document.getElementById('team-count');
    var teamNamesContainer = document.getElementById('team-names-container');
    var autofillBtn = document.getElementById('autofill-btn');
    var startBtn = document.getElementById('start-btn');
    var resumeBtn = document.getElementById('resume-btn');
    var resetBtn = document.getElementById('reset-btn');
    var toggleViewBtn = document.getElementById('toggle-view-btn');
    var dashboardContent = document.getElementById('dashboard-content');
    var matchList = document.getElementById('match-list');
    var bracketView = document.getElementById('bracket-view');
    var standingsBody = document.getElementById('standings-body');
    var backBtn = document.getElementById('back-btn');

    if (!startBtn) {
        console.error('CRITICAL: Start Button not found!');
        return;
    }

    // Init Team Inputs
    function updateTeamInputs() {
        var count = parseInt(teamCountInput.value) || 0;
        teamNamesContainer.innerHTML = '<label>팀 이름</label>';
        for (var i = 1; i <= count; i++) {
            var div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = '<input type="text" class="team-name-input" placeholder="Team ' + i + '" data-index="' + (i - 1) + '">';
            teamNamesContainer.appendChild(div);
        }
    }

    teamCountInput.addEventListener('change', updateTeamInputs);
    updateTeamInputs();

    // Autofill
    autofillBtn.addEventListener('click', function () {
        var inputs = document.querySelectorAll('.team-name-input');
        var suffixInput = document.getElementById('name-suffix');
        var suffix = suffixInput ? suffixInput.value.trim() : '';

        if (suffix) {
            inputs.forEach(function (input, i) {
                input.value = (i + 1) + suffix;
            });
        } else {
            var shuffled = teamNames.slice().sort(function () { return Math.random() - 0.5; });
            inputs.forEach(function (input, i) {
                input.value = shuffled[i % shuffled.length];
            });
        }
    });

    // View Toggle
    toggleViewBtn.addEventListener('click', function () {
        dashboardContent.classList.toggle('one-page');
    });

    // Option Selectors
    document.querySelectorAll('.option-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var parent = card.parentElement;
            parent.querySelectorAll('.option-card').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');

            if (card.dataset.type) config.type = card.dataset.type;
            if (card.dataset.matches) config.matchCount = parseInt(card.dataset.matches);
        });
    });

    // Round Robin Algorithm
    function generateRoundRobin(teamList) {
        var schedule = [];
        var tempTeams = teamList.slice();
        if (tempTeams.length % 2 !== 0) tempTeams.push({ id: -1, name: '부전승', isBye: true });

        var rounds = tempTeams.length - 1;
        var matchesPerRound = tempTeams.length / 2;

        for (var r = 0; r < rounds; r++) {
            for (var m = 0; m < matchesPerRound; m++) {
                var team1 = tempTeams[m];
                var team2 = tempTeams[tempTeams.length - 1 - m];

                if (team1 && team2) {
                    schedule.push({
                        team1: team1, team2: team2,
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
            tempTeams.splice(1, 0, tempTeams.pop());
        }
        return schedule;
    }

    // Tournament Logic
    function generateTournament(teamList) {
        var schedule = [];
        var tempTeams = teamList.slice();

        var nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(tempTeams.length)));
        while (tempTeams.length < nextPowerOf2) {
            tempTeams.push({ id: -1, name: '부전승', isBye: true });
        }

        tempTeams.sort(function () { return Math.random() - 0.5; });

        for (var i = 0; i < tempTeams.length; i += 2) {
            var t1 = tempTeams[i];
            var t2 = tempTeams[i + 1];

            var match = {
                team1: t1, team2: t2,
                score1: t2.isBye ? 1 : (t1.isBye ? 0 : null),
                score2: t2.isBye ? 0 : (t1.isBye ? 1 : null),
                id: schedule.length,
                round: 0
            };
            schedule.push(match);
        }
        config.tournamentStage = 0;
        return schedule;
    }

    // Start Competition
    startBtn.addEventListener('click', function () {
        console.log('Start Button Clicked');
        try {
            var nameInputs = document.querySelectorAll('.team-name-input');
            teams = Array.from(nameInputs).map(function (input, i) {
                return {
                    id: i,
                    name: input.value || ('Team ' + (i + 1)),
                    points: 0,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    sf: 0, sa: 0, gd: 0
                };
            });

            console.log('Teams initialized:', teams.length);

            var titleText = (config.type === 'league' ? '리그전' : '토너먼트') + ' - 경기 현황';
            var titleElem = document.getElementById('dashboard-title');
            if (titleElem) titleElem.textContent = titleText;

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

            console.log('Matches generated:', matches.length);

            setupScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');

            renderMatches();
            if (config.type === 'tournament') renderBracket();
            updateStandings();

            resumeBtn.classList.remove('hidden');
            console.log('Dashboard switched successfully');
        } catch (e) {
            console.error('Error starting competition:', e);
            alert('대회 시작 중 오류가 발생했습니다: ' + e.message);
        }
    });

    resumeBtn.addEventListener('click', function () {
        var nameInputs = document.querySelectorAll('.team-name-input');
        nameInputs.forEach(function (input, i) {
            if (teams[i]) teams[i].name = input.value || ('Team ' + (i + 1));
        });

        setupScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        renderMatches();
        if (config.type === 'tournament') renderBracket();
        updateStandings();
    });

    function renderBracket() {
        bracketView.innerHTML = '';
        var allRounds = matches.map(function (m) { return m.round; });
        var maxRound = Math.max.apply(null, allRounds);

        for (var r = 0; r <= maxRound; r++) {
            var roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';

            var roundMatches = matches.filter(function (m) { return m.round === r; });
            roundMatches.forEach(function (match) {
                var card = document.createElement('div');
                card.className = 'bracket-match';
                var team1Name = match.team1 ? match.team1.name : 'TBD';
                var team2Name = match.team2 ? match.team2.name : 'TBD';
                var isT1Bye = match.team1 && match.team1.isBye;
                var isT2Bye = match.team2 && match.team2.isBye;

                card.innerHTML =
                    '<div class="bracket-team ' + (match.score1 !== null && match.score1 > match.score2 ? 'winner' : '') + ' ' + (match.color1 || '') + '">' +
                    '<span>' + team1Name + '</span>' +
                    '<input type="number" class="score-input bracket-score" style="width: 40px; padding: 2px;" ' +
                    'data-match-id="' + match.id + '" data-team="1" value="' + (match.score1 !== null ? match.score1 : '') + '" ' +
                    (isT1Bye || isT2Bye ? 'disabled' : '') + '>' +
                    '<div class="color-toggle">' +
                    '<div class="color-btn red ' + (match.color1 === 'is-red' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color="is-red"></div>' +
                    '<div class="color-btn blue ' + (match.color1 === 'is-blue' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color="is-blue"></div>' +
                    '<div class="color-btn none ' + (!match.color1 ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color=""></div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="bracket-team ' + (match.score2 !== null && match.score2 > match.score1 ? 'winner' : '') + ' ' + (match.color2 || '') + '">' +
                    '<span>' + team2Name + '</span>' +
                    '<input type="number" class="score-input bracket-score" style="width: 40px; padding: 2px;" ' +
                    'data-match-id="' + match.id + '" data-team="2" value="' + (match.score2 !== null ? match.score2 : '') + '" ' +
                    (isT1Bye || isT2Bye ? 'disabled' : '') + '>' +
                    '<div class="color-toggle">' +
                    '<div class="color-btn red ' + (match.color2 === 'is-red' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color="is-red"></div>' +
                    '<div class="color-btn blue ' + (match.color2 === 'is-blue' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color="is-blue"></div>' +
                    '<div class="color-btn none ' + (!match.color2 ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color=""></div>' +
                    '</div>' +
                    '</div>';
                roundDiv.appendChild(card);
            });
            bracketView.appendChild(roundDiv);
        }

        bracketView.querySelectorAll('.score-input').forEach(function (input) {
            input.addEventListener('input', function (e) {
                var matchId = parseInt(e.target.dataset.matchId);
                var team = e.target.dataset.team;
                var val = e.target.value === '' ? null : parseInt(e.target.value);
                var mIdx = matches.findIndex(function (m) { return m.id === matchId; });
                if (team === '1') matches[mIdx].score1 = val;
                else matches[mIdx].score2 = val;
                checkTournamentProgress();
            });
        });

        bracketView.querySelectorAll('.color-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var matchId = parseInt(e.target.dataset.matchId);
                var team = e.target.dataset.team;
                var color = e.target.dataset.color;
                var mIdx = matches.findIndex(function (m) { return m.id === matchId; });
                if (team === '1') matches[mIdx].color1 = color;
                else matches[mIdx].color2 = color;
                renderBracket();
            });
        });
    }

    function renderMatches() {
        matchList.innerHTML = '';
        matches.forEach(function (match) {
            var isT1Bye = match.team1 && match.team1.isBye;
            var isT2Bye = match.team2 && match.team2.isBye;
            if (isT1Bye || isT2Bye) return;

            var card = document.createElement('div');
            card.className = 'match-card';
            card.innerHTML =
                '<div class="match-header">MATCH #' + (match.id + 1) + ' (라운드 ' + (match.round + 1) + ')</div>' +
                '<div class="match-teams">' +
                '<div class="team-info ' + (match.color1 || '') + '">' +
                '<span class="team-name">' + (match.team1 ? match.team1.name : 'TBD') + '</span>' +
                '<input type="number" class="score-input" data-match-id="' + match.id + '" data-team="1" value="' + (match.score1 !== null ? match.score1 : '') + '" placeholder="0">' +
                '<div class="color-toggle">' +
                '<div class="color-btn red ' + (match.color1 === 'is-red' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color="is-red"></div>' +
                '<div class="color-btn blue ' + (match.color1 === 'is-blue' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color="is-blue"></div>' +
                '<div class="color-btn none ' + (!match.color1 ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="1" data-color=""></div>' +
                '</div>' +
                '</div>' +
                '<div class="vs-badge">VS</div>' +
                '<div class="team-info ' + (match.color2 || '') + '">' +
                '<span class="team-name">' + (match.team2 ? match.team2.name : 'TBD') + '</span>' +
                '<input type="number" class="score-input" data-match-id="' + match.id + '" data-team="2" value="' + (match.score2 !== null ? match.score2 : '') + '" placeholder="0">' +
                '<div class="color-toggle">' +
                '<div class="color-btn red ' + (match.color2 === 'is-red' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color="is-red"></div>' +
                '<div class="color-btn blue ' + (match.color2 === 'is-blue' ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color="is-blue"></div>' +
                '<div class="color-btn none ' + (!match.color2 ? 'active' : '') + '" data-match-id="' + match.id + '" data-team="2" data-color=""></div>' +
                '</div>' +
                '</div>' +
                '</div>';
            matchList.appendChild(card);
        });

        document.querySelectorAll('.score-input').forEach(function (input) {
            input.addEventListener('input', function (e) {
                var matchId = parseInt(e.target.dataset.matchId);
                var team = e.target.dataset.team;
                var val = e.target.value === '' ? null : parseInt(e.target.value);
                var mIdx = matches.findIndex(function (m) { return m.id === matchId; });
                if (team === '1') matches[mIdx].score1 = val;
                else matches[mIdx].score2 = val;

                if (config.type === 'league') updateStandings();
                else checkTournamentProgress();
            });
        });

        matchList.querySelectorAll('.color-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var matchId = parseInt(e.target.dataset.matchId);
                var team = e.target.dataset.team;
                var color = e.target.dataset.color;
                var mIdx = matches.findIndex(function (m) { return m.id === matchId; });
                if (team === '1') matches[mIdx].color1 = color;
                else matches[mIdx].color2 = color;
                renderMatches();
            });
        });
    }

    function checkTournamentProgress() {
        var currentRoundMatches = matches.filter(function (m) { return m.round === config.tournamentStage; });
        var allFinished = currentRoundMatches.every(function (m) { return m.score1 !== null && m.score2 !== null; });

        if (allFinished) {
            var winners = currentRoundMatches.map(function (m) {
                if (m.score1 > m.score2) return m.team1;
                if (m.score2 > m.score1) return m.team2;
                return m.team1;
            });

            if (winners.length > 1) {
                if (confirm('다음 라운드 진학하시겠습니까?')) {
                    config.tournamentStage++;
                    var nextMatches = [];
                    for (var i = 0; i < winners.length; i += 2) {
                        var w2 = winners[i + 1] || { id: -1, name: '부전승', isBye: true };
                        nextMatches.push({
                            team1: winners[i],
                            team2: w2,
                            score1: winners[i + 1] ? null : 1,
                            score2: winners[i + 1] ? null : 0,
                            id: matches.length + nextMatches.length,
                            round: config.tournamentStage
                        });
                    }
                    matches = matches.concat(nextMatches);
                    renderMatches();
                    if (config.type === 'tournament') renderBracket();
                }
            } else if (winners.length === 1) {
                alert('축하합니다! 우승팀: ' + winners[0].name);
            }
        }
    }

    function updateStandings() {
        teams.forEach(function (t) {
            t.points = 0; t.played = 0; t.won = 0; t.drawn = 0; t.lost = 0;
            t.sf = 0; t.sa = 0; t.gd = 0;
        });

        matches.forEach(function (m) {
            if (!m.team1 || !m.team2) return;
            if (m.team1.id === -1 || m.team2.id === -1) return;
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

        teams.forEach(function (t) { t.gd = t.sf - t.sa; });
        var sortedTeams = teams.slice().sort(function (a, b) {
            return b.points - a.points || b.gd - a.gd || b.sf - a.sf;
        });

        standingsBody.innerHTML = '';
        sortedTeams.forEach(function (t, i) {
            var tr = document.createElement('tr');
            tr.className = 'team-row';
            tr.innerHTML =
                '<td><span class="rank-text rank-' + (i + 1) + '">#' + (i + 1) + '</span></td>' +
                '<td><strong>' + t.name + '</strong></td>' +
                '<td>' + t.played + '</td>' +
                '<td>' + t.won + '/' + t.drawn + '/' + t.lost + '</td>' +
                '<td>' + t.sf + '/' + t.sa + '</td>' +
                '<td><span class="' + (t.gd > 0 ? 'gd-positive' : (t.gd < 0 ? 'gd-negative' : '')) + '">' + (t.gd > 0 ? '+' : '') + t.gd + '</span></td>' +
                '<td><span class="rank-text">' + t.points + '</span></td>';
            standingsBody.appendChild(tr);
        });
    }

    backBtn.addEventListener('click', function () {
        dashboardScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    });

    resetBtn.addEventListener('click', function () {
        if (confirm('모든 기록을 초기화하시겠습니까?')) {
            dashboardScreen.classList.add('hidden');
            setupScreen.classList.remove('hidden');
            resumeBtn.classList.add('hidden');
        }
    });
});
