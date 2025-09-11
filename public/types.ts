export type WeekHourLog = {
    'hours': number;
    'week': number;
};

export type TBAMatchOutcome = {
    'winner': 'red' | 'blue';
    'match_number': number;
}

export type PredictionStats = {
    'correct': number;
    'incorrect': number;
    'balance': number;
}