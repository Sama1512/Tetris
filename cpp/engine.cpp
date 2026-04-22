// Tetris/cpp/engine.cpp
// レベル1(練習用)〜レベル10(神) 対応 CPUエンジン (BFS搭載・ガチ勢対応)

#include <bits/stdc++.h>
using namespace std;

// ======================= ミノ形状 =========================
struct Shape {
    array<vector<pair<int,int>>,4> rot;
};
static unordered_map<char, Shape> shapes;

void init_shapes() {
    if (!shapes.empty()) return;

    Shape I;
    I.rot[0]={{0,1},{1,1},{2,1},{3,1}};   // 横: y+1
    I.rot[1]={{2,0},{2,1},{2,2},{2,3}};   // 縦: x+2
    I.rot[2]={{0,2},{1,2},{2,2},{3,2}};   // 横: y+2 (JS SRS標準)
    I.rot[3]={{1,0},{1,1},{1,2},{1,3}};   // 縦: x+1 (JS SRS標準)
    shapes['I']=I;

    Shape O;
    O.rot[0]={{1,0},{2,0},{1,1},{2,1}};
    O.rot[1]=O.rot[0]; O.rot[2]=O.rot[0]; O.rot[3]=O.rot[0];
    shapes['O']=O;

    Shape T;
    T.rot[0]={{1,0},{0,1},{1,1},{2,1}};
    T.rot[1]={{1,0},{1,1},{2,1},{1,2}};
    T.rot[2]={{0,1},{1,1},{2,1},{1,2}};
    T.rot[3]={{1,0},{0,1},{1,1},{1,2}};
    shapes['T']=T;

    Shape S;
    S.rot[0]={{1,0},{2,0},{0,1},{1,1}};
    S.rot[1]={{1,0},{1,1},{2,1},{2,2}};
    S.rot[2]={{1,1},{2,1},{0,2},{1,2}};   // JS SRS標準
    S.rot[3]={{0,0},{0,1},{1,1},{1,2}};   // JS SRS標準
    shapes['S']=S;

    Shape Z;
    Z.rot[0]={{0,0},{1,0},{1,1},{2,1}};
    Z.rot[1]={{2,0},{1,1},{2,1},{1,2}};
    Z.rot[2]={{0,1},{1,1},{1,2},{2,2}};   // JS SRS標準
    Z.rot[3]={{1,0},{0,1},{1,1},{0,2}};   // JS SRS標準
    shapes['Z']=Z;

    Shape J;
    J.rot[0]={{0,0},{0,1},{1,1},{2,1}};
    J.rot[1]={{1,0},{2,0},{1,1},{1,2}};
    J.rot[2]={{0,1},{1,1},{2,1},{2,2}};
    J.rot[3]={{1,0},{1,1},{0,2},{1,2}};
    shapes['J']=J;

    Shape L;
    L.rot[0]={{2,0},{0,1},{1,1},{2,1}};
    L.rot[1]={{1,0},{1,1},{1,2},{2,2}};
    L.rot[2]={{0,1},{1,1},{2,1},{0,2}};
    L.rot[3]={{0,0},{1,0},{1,1},{1,2}};
    shapes['L']=L;
}

// Kick tables for Y-down
const int KICKS_JLSTZ[8][5][2] = {
    {{0,0}, {-1,0}, {-1,-1}, {0, 2}, {-1, 2}}, // 0->1
    {{0,0}, { 1,0}, { 1, 1}, {0,-2}, { 1,-2}}, // 1->0
    {{0,0}, { 1,0}, { 1, 1}, {0,-2}, { 1,-2}}, // 1->2
    {{0,0}, {-1,0}, {-1,-1}, {0, 2}, {-1, 2}}, // 2->1
    {{0,0}, { 1,0}, { 1,-1}, {0, 2}, { 1, 2}}, // 2->3
    {{0,0}, {-1,0}, {-1, 1}, {0,-2}, {-1,-2}}, // 3->2
    {{0,0}, {-1,0}, {-1, 1}, {0,-2}, {-1,-2}}, // 3->0
    {{0,0}, { 1,0}, { 1,-1}, {0, 2}, { 1, 2}}  // 0->3
};

const int KICKS_I[8][5][2] = {
    {{0,0}, {-2,0}, { 1,0}, {-2, 1}, { 1,-2}},
    {{0,0}, { 2,0}, {-1,0}, { 2,-1}, {-1, 2}},
    {{0,0}, {-1,0}, { 2,0}, {-1,-2}, { 2, 1}},
    {{0,0}, { 1,0}, {-2,0}, { 1, 2}, {-2,-1}},
    {{0,0}, { 2,0}, {-1,0}, { 2,-1}, {-1, 2}},
    {{0,0}, {-2,0}, { 1,0}, {-2, 1}, { 1,-2}},
    {{0,0}, { 1,0}, {-2,0}, { 1, 2}, {-2,-1}},
    {{0,0}, {-1,0}, { 2,0}, {-1,-2}, { 2, 1}}
};

int getKickIndex(int from, int to) {
    if (from==0 && to==1) return 0;
    if (from==1 && to==0) return 1;
    if (from==1 && to==2) return 2;
    if (from==2 && to==1) return 3;
    if (from==2 && to==3) return 4;
    if (from==3 && to==2) return 5;
    if (from==3 && to==0) return 6;
    if (from==0 && to==3) return 7;
    return 0; 
}


// ======================= 盤面 =========================
struct Board {
    static constexpr int W = 10;
    static constexpr int H = 20;
    array<array<int,W>,H> g{};

    bool collideAt(char p,int r,int px,int py) const {
        const auto &cells = shapes.at(p).rot[r];
        for (auto [dx,dy] : cells) {
            int x = px + dx;
            int y = py + dy;
            if (x < 0 || x >= W || y >= H) return true;
            if (y >= 0 && g[y][x])         return true;
        }
        return false;
    }

    Board placed(char p,int r,int px,int py, int *outClears=nullptr) const {
        Board b = *this;
        for (auto [dx,dy] : shapes.at(p).rot[r]) {
            int x = px + dx;
            int y = py + dy;
            if (0 <= x && x < W && 0 <= y && y < H) {
                b.g[y][x] = 1;
            }
        }

        array<int,H> keep{};
        int nh = 0;
        int clears = 0;
        for (int y=0;y<H;y++) {
            bool full = true;
            for (int x=0;x<W;x++) if (!b.g[y][x]) { full = false; break; }
            if (!full) keep[nh++] = y;
            else       clears++;
        }
        if (outClears) *outClears = clears;
        if (nh == H) return b;

        Board c;
        int y2 = H-1;
        for (int k=nh-1;k>=0;k--) {
            int y = keep[k];
            for (int x=0;x<W;x++) c.g[y2][x] = b.g[y][x];
            y2--;
        }
        return c;
    }
};

// ======================= 入力 =========================
struct Input {
    int  level    = 5;
    char piece    = 'T';
    int  currentY = 0;
    string boardFlat;
    bool   hasHold  = false;
    char   holdPiece= ' ';
    string nextSeq;        
    bool   canHold  = true;
    int    b2b      = 0;
    int    combo    = -1;
};

bool parseInput(Input &in) {
    string s;
    { ostringstream oss; oss << cin.rdbuf(); s = oss.str(); }

    auto findVal = [&](const string &key)->string{
        size_t p = s.find("\""+key+"\"");
        if (p==string::npos) return "";
        p = s.find(':', p);
        if (p==string::npos) return "";
        while (p<s.size() && (s[p]==':' || isspace((unsigned char)s[p]))) p++;
        if (p>=s.size()) return "";
        if (s[p]=='\"') {
            size_t q = s.find('"', p+1);
            if (q==string::npos) return "";
            return s.substr(p+1, q-(p+1));
        }
        size_t q=p;
        while (q<s.size() && (isdigit((unsigned char)s[q]) ||
                              isalpha((unsigned char)s[q]) ||
                              s[q]=='-')) q++;
        return s.substr(p,q-p);
    };

    string lv = findVal("level");
    if (!lv.empty()) {
        try { in.level = stoi(lv); } catch(...) {}
    }

    string pc = findVal("piece");
    if (!pc.empty()) in.piece = (char)toupper((unsigned char)pc[0]);

    string cy = findVal("current_y");
    if (!cy.empty()) {
        try { in.currentY = stoi(cy); } catch(...) {}
    }

    string hd = findVal("hold");
    if (!hd.empty()) {
        in.hasHold   = true;
        in.holdPiece = (char)toupper((unsigned char)hd[0]);
    }

    string nx = findVal("next");
    if (!nx.empty()) {
        in.nextSeq.clear();
        for (char c : nx) {
            char u = (char)toupper((unsigned char)c);
            in.nextSeq.push_back(u);
        }
    }

    string ch = findVal("canHold");
    if (!ch.empty()) {
        char c0 = (char)tolower((unsigned char)ch[0]);
        in.canHold = (c0=='t' || c0=='1' || c0=='y');
    }
    
    string b2 = findVal("b2b");
    if (!b2.empty()) {
        try { in.b2b = stoi(b2); } catch(...) {}
    }
    
    string co = findVal("combo");
    if (!co.empty()) {
        try { in.combo = stoi(co); } catch(...) {}
    }

    in.boardFlat = findVal("board_flat");
    return !in.boardFlat.empty();
}

// ======================= レベルごとの設定 =========================

struct Stats {
    int heightSum;
    int holes;
    int bump;
    int maxH;
    int wellDepth; // for Tetris capability
};

Stats computeStats(const Board &b) {
    const int W = Board::W, H = Board::H;

    vector<int> heights(W,0);
    vector<int> holes(W,0);

    for (int x=0; x<W; x++) {
        bool seen = false;
        for (int y=0; y<H; y++) {
            if (b.g[y][x]) {
                if (!seen) {
                    heights[x] = H - y;
                    seen = true;
                }
            } else if (seen) {
                holes[x]++;
            }
        }
    }

    int heightSum = 0;
    int holeSum   = 0;
    int bump      = 0;
    int maxH      = 0;

    for (int x=0; x<W; x++) {
        heightSum += heights[x];
        holeSum   += holes[x];
        maxH       = max(maxH, heights[x]);
    }
    for (int x=0; x<W-1; x++) {
        bump += abs(heights[x] - heights[x+1]);
    }
    
    // Evaluate well depth logic roughly
    int wellDepth = 0;
    for (int x=0; x<W; x++) {
        int leftH = (x == 0) ? H : heights[x-1];
        int rightH = (x == W-1) ? H : heights[x+1];
        int h = heights[x];
        if (leftH > h && rightH > h) {
            int depth = min(leftH, rightH) - h;
            if (depth > wellDepth) wellDepth = depth;
        }
    }

    return {heightSum, holeSum, bump, maxH, wellDepth};
}

struct LevelConfig {
    bool useHold;
    int  maxPly;
    int  maxNextUse;
    double noiseAmp;
    double misdropRate;
    double holdBaseCost;
    double holdBiasI;
    double holdBiasT;
    double wFuture1;
    double wFuture2;
    double wFuture3;
    double clearScale;
    double tetrisBonus;
    double tspinSingleBonus;
    double tspinDoubleBonus;
    double tspinTripleBonus;
    double pcBonus;
    double renBonus;
    double b2bBonus;
    double heightCoeff;
    double topDangerCoeff;
    double holeCoeff;
    double bumpCoeff;
    double tetrisWellReward; // Reward keeping a well
};

static LevelConfig LEVELS[11] = {
    // idx 0
    {false, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.15, 400, 16.0, 4.0, 0},

    // =============== Lv1: 練習用 ===============
    {false, 1, 0,
     350.0, 0.15,
     1000, 0, 0,
     0.0, 0.0, 0.0,
     0.6, 0,
     0, 0, 0,
     0, 0, 0,
     1.35, 600,
     20.0, 5.0, 0},

    // =============== Lv2: 初心者 ===============
    {false, 1, 0,
     250.0, 0.10,
     1000, 0, 0,
     0.0, 0.0, 0.0,
     0.7, 0,
     0, 0, 0,
     0, 0, 0,
     1.30, 550,
     18.0, 4.5, 0},

    // =============== Lv3: 初級 ===============
    {false, 1, 0,
     150.0, 0.06,
     1000, 0, 0,
     0.0, 0.0, 0.0,
     0.85, 80,
     50, 100, 150,
     0, 0, 0,
     2.0, 500, 
     60.0, 15.0, 0},

    // =============== Lv4: 中級 ===============
    {false, 1, 0,
     80.0, 0.03,
     1000, 0, 0,
     0.0, 0.0, 0.0,
     0.95, 150,
     80, 160, 250,
     0, 10, 0,
     2.5, 450,
     100.0, 25.0, 10},

    // =============== Lv5: 標準（基準レベル） ===============
    {false, 1, 1,
     0.0, 0.0,
     1000, 0, 0,
     0.0, 0.0, 0.0,
     1.0, 200,         // clearScale=1.0, tetrisBonus=200
     80, 400, 0,        // tspinSingle=80, tspinDouble=400, tspinTriple=0
     500, 25, 100,
     3.0, 400,
     150.0, 30.0, 80}, // tetrisWellReward=80

    // =============== Lv6: 上級 ===============
    {true, 1, 1,
     0.0, 0.0,
     35, -8, -5,
     0.0, 0.0, 0.0,
     1.0, 350,         // clearScale=1.0 (有効), tetrisBonus=350
     150, 800, 1200,   // tspinSingle=150, tspinDouble=800, tspinTriple=1200
     800, 40, 200,
     3.5, 400,
     250.0, 38.0, 150}, // tetrisWellReward=150

    // =============== Lv7: エキスパート ===============
    {true, 2, 2,
     0.0, 0.0,
     25, -18, -12,
     0.45, 0.0, 0.0,
     1.0, 1000,        // clearScale=1.0 (有効), tetrisBonus=1000
     300, 1500, 2500,  // tspinSingle=300, tspinDouble=1500, tspinTriple=2500
     2500, 80, 400,
     4.5, 400,
     400.0, 45.0, 250}, // tetrisWellReward=250

    // =============== Lv8: マスター ===============
    {true, 2, 3,
     0.0, 0.0,
     20, -25, -18,
     0.55, 0.0, 0.0,
     1.6, 1800,
     900, 2200, 3500,
     4000, 120, 600,
     6.0, 280,
     600.0, 45.0, 200},

    // =============== Lv9: 伝説 ===============
    {true, 3, 4,
     0.0, 0.0,
     15, -30, -20,
     0.40, 0.30, 0.0,
     1.8, 2500,
     1200, 3500, 5500,
     8000, 200, 1000,
     8.0, 240,
     800.0, 50.0, 300},

    // =============== Lv10: 神 ===============
    {true, 3, 5,
     0.0, 0.0,
     15, -25, -18,
     0.35, 0.40, 0.20,
     1.8, 3000,
     1500, 4000, 6000,
     10000, 300, 1500,
     10.0, 220,
     1000.0, 55.0, 500},
};

double randNoise(double amp) {
    if (amp <= 0.0) return 0.0;
    double r = (double)std::rand() / (double)RAND_MAX; 
    return (2.0 * r - 1.0) * amp;
}

// T-Spin Check
int classifyTSpinStrict(const Board &before, char piece, int rot, int px, int py, int linesCleared, bool lastRotated, int lastKickIndex) {
    if (piece != 'T' || !lastRotated) return 0; // 0 = normal
    int cx = px + 1;
    int cy = py + 1;
    auto filled = [&](int x, int y)->bool {
        if (x < 0 || x >= Board::W || y < 0 || y >= Board::H) return true;
        return before.g[y][x] != 0;
    };
    int corners = 0;
    if (filled(cx-1, cy-1)) corners++;
    if (filled(cx+1, cy-1)) corners++;
    if (filled(cx-1, cy+1)) corners++;
    if (filled(cx+1, cy+1)) corners++;
    if (corners < 3) return 0;
    
    int front = 0;
    if (rot == 0) { if(filled(cx-1,cy-1)) front++; if(filled(cx+1,cy-1)) front++; }
    else if (rot == 1) { if(filled(cx+1,cy-1)) front++; if(filled(cx+1,cy+1)) front++; }
    else if (rot == 2) { if(filled(cx-1,cy+1)) front++; if(filled(cx+1,cy+1)) front++; }
    else if (rot == 3) { if(filled(cx-1,cy-1)) front++; if(filled(cx-1,cy+1)) front++; }

    bool isMini = (front < 2);
    if (lastKickIndex == 4) isMini = false;

    if (linesCleared == 0) return isMini ? 1 : 2; // 1=mini, 2=full
    if (linesCleared == 1) return isMini ? 1 : 2;
    return 2; 
}

bool isPerfectClear(const Board &after) {
    for (int y = 0; y < Board::H; y++) {
        for (int x = 0; x < Board::W; x++) {
            if (after.g[y][x]) return false;
        }
    }
    return true;
}

int estimateRenPotential(const Board &after) {
    int potential = 0;
    for (int y = Board::H - 1; y >= Board::H - 6; y--) {
        int filled = 0;
        for (int x = 0; x < Board::W; x++) {
            if (after.g[y][x]) filled++;
        }
        if (filled >= 8 && filled < 10) potential++;
    }
    return potential;
}

// Evaluate function
double evaluateBoard(const Board &before, const Board &after, char piece, int rot, int px, int py, int clears, 
                     const LevelConfig &cfg, Stats &stOut, bool lastRotated, int lastKickIndex, int b2b, int combo) {
    stOut = computeStats(after);

    // ライン消し報酬: シングル=300, ダブル=700, トリプル=1400, テトリス=3000
    static const double clearPtsBase[5] = {0.0, 300.0, 700.0, 1400.0, 3000.0};
    int idx = clears < 0 ? 0 : (clears > 4 ? 4 : clears);
    double clearScore = clearPtsBase[idx] * cfg.clearScale;

    double s = 0.0;
    
    s -= stOut.heightSum * cfg.heightCoeff;
    s -= stOut.holes     * cfg.holeCoeff;   
    s -= stOut.bump      * cfg.bumpCoeff;   
    s += clearScore;

    int topDanger = max(0, stOut.maxH - 17);
    s -= topDanger * cfg.topDangerCoeff;
    s += -0.05 * abs(px - 4);
    
    if (cfg.tetrisWellReward > 0) {
        if (stOut.wellDepth >= 3) {
            s += cfg.tetrisWellReward * min(stOut.wellDepth, 4);
        }
    }

    if (clears > 0 && isPerfectClear(after)) s += cfg.pcBonus;

    int newCombo = (clears > 0) ? (combo < 0 ? 0 : combo + 1) : -1;
    if (newCombo > 0) s += newCombo * cfg.renBonus;
    
    if (clears == 0) {
        int renPot = estimateRenPotential(after);
        s += renPot * cfg.renBonus * 0.5; // partial reward for setup
    }

    int tspinClass = classifyTSpinStrict(before, piece, rot, px, py, clears, lastRotated, lastKickIndex);
    bool b2bEligible = (clears == 4) || tspinClass > 0;
    
    double tsBonus = 0;
    if (tspinClass == 2) {
        if (clears == 0) tsBonus = cfg.tspinSingleBonus * 0.5;
        else if (clears == 1) tsBonus = cfg.tspinSingleBonus;
        else if (clears == 2) tsBonus = cfg.tspinDoubleBonus;
        else if (clears >= 3) tsBonus = cfg.tspinTripleBonus;
    } else if (tspinClass == 1) {
        tsBonus = cfg.tspinSingleBonus * 0.25; 
    } 
    
    if (tsBonus > 0) s += tsBonus;
    else if (clears == 4) s += cfg.tetrisBonus;

    if (b2bEligible && b2b > 0) {
        s += cfg.b2bBonus;
    } else if (clears > 0 && !b2bEligible) {
        // Punish breaking b2b if we are at high level
        s -= cfg.b2bBonus * 0.5;
    }

    if (stOut.maxH >= Board::H) s -= 1e9;

    return s;
}

// ======================= 候補表現 =========================
struct Cand {
    bool   found = false;
    int    rot   = 0;
    int    x     = 3;
    int    y     = 0;
    double score = -1e18;
    int    maxH  = 0;
    string path; // Like "L,L,SD,CW,HD,"
};

// BFS Move Generator
vector<Cand> generateMoves(const Board &base, char piece, const LevelConfig &cfg, bool applyNoise, int b2b, int combo, int explicitStartY = -999) {
    vector<Cand> results;
    if (!shapes.count(piece)) return results;
    
    bool visited[4][25][20] = {}; // rot[0-3], y+5, x+5
    
    struct State {
        int x, y, r;
        int lastKickIndex;
        bool lastRotated;
        string path;
    };
    
    queue<State> Q;
    int startY = (explicitStartY != -999) ? explicitStartY : 0;
    
    if (explicitStartY == -999) {
        if (base.collideAt(piece, 0, 3, 0)) {
            if (!base.collideAt(piece, 0, 3, -1)) startY = -1;
            else if (!base.collideAt(piece, 0, 3, -2)) startY = -2;
            else return results; // completely blocked
        }
    } else {
        if (base.collideAt(piece, 0, 3, startY)) {
            // Already blocked at explicit Y (e.g. piece spawned inside garbage)
            return results;
        }
    }
    
    Q.push({3, startY, 0, -1, false, ""});
    visited[0][startY+5][3+5] = true;
    
    // We only want to add locked placements to results once per combination
    bool lockedVisited[4][25][20] = {};

    while(!Q.empty()) {
        auto st = Q.front();
        Q.pop();
        
        // ---- 横移動・回転を先から、SDは後にキューに積む (L, R, CW, CCW, SD) ----
        
        // 1. L
        if (!base.collideAt(piece, st.r, st.x - 1, st.y)) {
            if (!visited[st.r][st.y+5][st.x-1+5]) {
                visited[st.r][st.y+5][st.x-1+5] = true;
                Q.push({st.x-1, st.y, st.r, -1, false, st.path + "L,"});
            }
        }
        
        // 2. R
        if (!base.collideAt(piece, st.r, st.x + 1, st.y)) {
            if (!visited[st.r][st.y+5][st.x+1+5]) {
                visited[st.r][st.y+5][st.x+1+5] = true;
                Q.push({st.x+1, st.y, st.r, -1, false, st.path + "R,"});
            }
        }
        
        // 3. CW
        int nextR_cw = (st.r + 1) % 4;
        if (piece == 'O') {
            if (!base.collideAt(piece, nextR_cw, st.x, st.y)) {
                if (!visited[nextR_cw][st.y+5][st.x+5]) {
                    visited[nextR_cw][st.y+5][st.x+5] = true;
                    Q.push({st.x, st.y, nextR_cw, -1, false, st.path + "CW,"});
                }
            }
        } else {
            int kIdx = getKickIndex(st.r, nextR_cw);
            auto &table = (piece == 'I') ? KICKS_I[kIdx] : KICKS_JLSTZ[kIdx];
            for (int i=0; i<5; i++) {
                int nx = st.x + table[i][0];
                int ny = st.y + table[i][1];
                if (!base.collideAt(piece, nextR_cw, nx, ny)) {
                    if (!visited[nextR_cw][ny+5][nx+5]) {
                        visited[nextR_cw][ny+5][nx+5] = true;
                        Q.push({nx, ny, nextR_cw, i, true, st.path + "CW,"});
                    }
                    break; 
                }
            }
        }
        
        // 4. CCW
        int nextR_ccw = (st.r + 3) % 4;
        if (piece == 'O') {
            if (!base.collideAt(piece, nextR_ccw, st.x, st.y)) {
                if (!visited[nextR_ccw][st.y+5][st.x+5]) {
                    visited[nextR_ccw][st.y+5][st.x+5] = true;
                    Q.push({st.x, st.y, nextR_ccw, -1, false, st.path + "CCW,"});
                }
            }
        } else {
            int kIdx = getKickIndex(st.r, nextR_ccw);
            auto &table = (piece == 'I') ? KICKS_I[kIdx] : KICKS_JLSTZ[kIdx];
            for (int i=0; i<5; i++) {
                int nx = st.x + table[i][0];
                int ny = st.y + table[i][1];
                if (!base.collideAt(piece, nextR_ccw, nx, ny)) {
                    if (!visited[nextR_ccw][ny+5][nx+5]) {
                        visited[nextR_ccw][ny+5][nx+5] = true;
                        Q.push({nx, ny, nextR_ccw, i, true, st.path + "CCW,"});
                    }
                    break;
                }
            }
        }

        // 5. Hard Drop testing (collision means locked)
        if (base.collideAt(piece, st.r, st.x, st.y + 1)) {
            if (!lockedVisited[st.r][st.y+5][st.x+5]) {
                lockedVisited[st.r][st.y+5][st.x+5] = true;
                
                int clears = 0;
                Board after = base.placed(piece, st.r, st.x, st.y, &clears);
                Stats stOut;
                double sc = evaluateBoard(base, after, piece, st.r, st.x, st.y, clears, cfg, stOut, st.lastRotated, st.lastKickIndex, b2b, combo);
                
                Cand c;
                c.found = true;
                c.rot = st.r; c.x = st.x; c.y = st.y;
                c.score = sc + (applyNoise ? randNoise(cfg.noiseAmp) : 0.0);
                c.maxH = stOut.maxH;
                c.path = st.path + "HD,"; // harddrop
                results.push_back(c);
            }
        } else {
            // SDは L/R/CW/CCWの後に探索
            if (!visited[st.r][st.y+1+5][st.x+5]) {
                visited[st.r][st.y+1+5][st.x+5] = true;
                Q.push({st.x, st.y+1, st.r, -1, false, st.path + "SD,"});
            }
        }
    }
    
    return results;
}

Cand searchBestSingle(const Board &base, char piece, const LevelConfig &cfg, bool applyNoise, int b2b, int combo, int currentY = -999) {
    vector<Cand> cands = generateMoves(base, piece, cfg, applyNoise, b2b, combo, currentY);
    if (cands.empty()) return Cand{};
    
    Cand best = cands[0];
    for (const auto &c : cands) {
        if (c.score > best.score) best = c;
    }
    return best;
}

Cand searchBestMulti(const Board &base, char piece0, const string &nextSeq, const LevelConfig &cfg, int startIdxForNext, int b2b, int combo, int currentY = -999) {
    if (cfg.maxPly <= 1 || !shapes.count(piece0)) {
        return searchBestSingle(base, piece0, cfg, true, b2b, combo, currentY);
    }

    vector<Cand> tier1, tier2, tier3;
    vector<Cand> baseCands = generateMoves(base, piece0, cfg, true, b2b, combo, currentY);
    
    for (auto c : baseCands) {
        // Multi-level evaluation
        int clears1 = 0;
        Board after1 = base.placed(piece0, c.rot, c.x, c.y, &clears1);
        
        int n_b2b = b2b;
        int n_combo = combo;
        
        // simple simulation for multipy since we don't have perfect lastRotated etc down here for the heuristic
        if (clears1 == 4) n_b2b = b2b > 0 ? b2b + 1 : 1;
        else if (clears1 > 0) n_b2b = 0;
        
        if (clears1 > 0) n_combo = combo < 0 ? 0 : combo + 1;
        else n_combo = -1;

        double s2 = 0.0, s3 = 0.0;
        char p1 = 0;
        if (cfg.maxPly >= 2 && startIdxForNext < (int)nextSeq.size()) {
            p1 = (char)toupper((unsigned char)nextSeq[startIdxForNext]);
            if (!shapes.count(p1)) p1 = 0;
        }

        if (p1) {
            Cand fut1 = searchBestSingle(after1, p1, cfg, false, n_b2b, n_combo);
            if (fut1.found) {
                s2 = fut1.score;
                
                char p2 = 0;
                if (cfg.maxPly >= 3 && (startIdxForNext + 1) < (int)nextSeq.size()) {
                    p2 = (char)toupper((unsigned char)nextSeq[startIdxForNext+1]);
                    if (!shapes.count(p2)) p2 = 0;
                }
                if (p2) {
                    int c2 = 0;
                    Board after2 = after1.placed(p1, fut1.rot, fut1.x, fut1.y, &c2);
                    Cand fut2 = searchBestSingle(after2, p2, cfg, false, n_b2b, n_combo);
                    if (fut2.found) s3 = fut2.score;
                }
            }
        }

        double w1 = cfg.wFuture1;
        double w2 = cfg.wFuture2;
        if (cfg.maxPly < 3) w2 = 0.0;
        double w0 = 1.0 - w1 - w2;
        if (w0 < 0.0) w0 = 0.0;

        c.score = w0 * c.score + w1 * s2 + w2 * s3;

        if (c.maxH <= 16)      tier1.push_back(c);
        else if (c.maxH <=18)  tier2.push_back(c);
        else                   tier3.push_back(c);
    }

    auto pickBest = [](const vector<Cand> &v)->Cand{
        if (v.empty()) return Cand{};
        Cand b = v[0];
        for (const auto &c : v) {
            if (c.score > b.score) b = c;
        }
        return b;
    };

    if (!tier1.empty())      return pickBest(tier1);
    else if (!tier2.empty()) return pickBest(tier2);
    else if (!tier3.empty()) return pickBest(tier3);

    return searchBestSingle(base, piece0, cfg, true, b2b, combo, currentY);
}

Cand searchForLevel(const Board &base, char piece0, const string &nextSeq, const LevelConfig &cfg, int startIdxForNext, int b2b, int combo, int currentY = -999) {
    if (cfg.maxPly <= 1) {
        return searchBestSingle(base, piece0, cfg, true, b2b, combo, currentY);
    }
    return searchBestMulti(base, piece0, nextSeq, cfg, startIdxForNext, b2b, combo, currentY);
}

// ======================= main =========================
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    std::srand((unsigned)std::time(nullptr));

    init_shapes();

    Input in;
    if (!parseInput(in)) {
        cout << "{\"rotation\":0,\"targetX\":3,\"useHold\":false,\"engine\":\"cpp-bfs\"}\n";
        return 0;
    }

    if (!shapes.count(in.piece)) in.piece = 'T';

    Board base;
    if (in.boardFlat.size() >= Board::W * Board::H) {
        int idx=0;
        for (int y=0;y<Board::H;y++)
            for (int x=0;x<Board::W;x++)
                base.g[y][x] = (in.boardFlat[idx++]=='1') ? 1 : 0;
    }

    int level = in.level;
    if (level < 1) level = 1;
    if (level > 10) level = 10;
    LevelConfig cfg = LEVELS[level];

    Cand noHold = searchForLevel(base, in.piece, in.nextSeq, cfg, 0, in.b2b, in.combo, in.currentY);

    bool useHold = false;
    Cand chosen  = noHold;

    if (cfg.useHold && in.canHold) {
        char spawnType   = 0;
        int  startIdx    = 0;

        if (in.hasHold) {
            spawnType = in.holdPiece;
            startIdx  = 0;
        } else if (!in.hasHold && !in.nextSeq.empty()) {
            spawnType = in.nextSeq[0];
            startIdx  = 1;
        }

        if (spawnType && shapes.count(spawnType)) {
            // Note: hold plan starts at the top buffer (invisible row -2 conceptually, but C++ evaluates without explicit setting to fallback intelligently)
            Cand holdPlan = searchForLevel(base, spawnType, in.nextSeq, cfg, startIdx, in.b2b, in.combo, -2);
            if (holdPlan.found) {
                double bias = 0.0;
                if      (spawnType=='I') bias = cfg.holdBiasI;
                else if (spawnType=='T') bias = cfg.holdBiasT;

                double cost = cfg.holdBaseCost + bias;
                double holdScoreAdj = holdPlan.score - cost;
                double noHoldScore  = noHold.found ? noHold.score : -1e18;

                if (!noHold.found || holdScoreAdj > noHoldScore) {
                    chosen  = holdPlan;
                    useHold = true;
                }
            }
        }
    }

    if (!chosen.found) {
        chosen.found = true;
        chosen.rot   = 0;
        chosen.x     = 3;
        chosen.path  = "HD,";
        useHold      = false;
    }

    if (cfg.misdropRate > 0.0) {
        double roll = (double)std::rand() / (double)RAND_MAX;
        if (roll < cfg.misdropRate) {
            // Very simple fallback bad path for misdrop:
            chosen.path = "L,L,R,HD,";
        }
    }

    if (chosen.path.empty()) chosen.path = "HD,";

    // JSON serialize
    cout << "{\"rotation\":" << chosen.rot
         << ",\"targetX\":"   << chosen.x
         << ",\"useHold\":"   << (useHold ? "true" : "false")
         << ",\"level\":" << level
         << ",\"path\":\"" << chosen.path << "\""
         << ",\"engine\":\"cpp-lv1-10-bfs\"}";
    return 0;
}
