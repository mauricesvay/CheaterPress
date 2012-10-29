var Search = {

    letters : '',
    bigrams : [],

    matchWord : function(word, letters) {
        for (var i = 0; i < word.length; i++) {
            letter = word.charAt(i);
            idx = letters.indexOf(letter);
            if (-1 !== idx) {
                letters = letters.replace(letter,'-');
            } else {
                return false;
            }
        }
        return true;
    },

    generateBigrams : function(letters) {
        var bigram;
        var seen = {};
        for (var i = 0; i < letters.length; i++) {
            for (var j = 0; j < letters.length; j++) {
                if (i != j) {
                    bigram = letters.charAt(i) + letters.charAt(j);
                    if (typeof words[bigram] !== 'undefined') {
                        if (typeof seen[bigram] !== 'undefined') {
                            //dont store duplicates
                        } else {
                            seen[bigram] = 1;
                            Search.bigrams.push(bigram);
                        }
                    }
                }
            }
        }
    },

    getResults: function(letters) {
        var bigram;
        var word;
        var results = [];

        Search.letters = letters.toLowerCase();
        Search.generateBigrams(Search.letters);

        for (var i = 0, l = Search.bigrams.length; i<l; i++) {
            bigram = Search.bigrams[i];
            for (var j = 0, m = words[bigram].length; j<m; j++) {
                word = words[bigram][j];
                if (Search.matchWord(word, Search.letters)) {
                    results.push(word);
                }
            }
        }
        results.sort(function(a,b){
            return -1 * (a.length - b.length);
        });

        return results;
    }
};