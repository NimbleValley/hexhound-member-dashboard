export type WeekHourLog = {
    'hours': number;
    'week': string;
};

export type TBAMatchOutcome = {
    'winning_alliance': 'red' | 'blue';
    'match_number': number;
    'comp_level': string;
}

export type PredictionStats = {
    'correct': number;
    'incorrect': number;
    'balance': number;
}