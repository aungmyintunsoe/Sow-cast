"""Sowcast rotation recommender (reference implementation). Reads the CSVs, writes recommendations."""
import pandas as pd, itertools, json, sys, os
# Sowcast pipeline: input folder is configurable (data/scripts/05d_recommend_rotations.py points it at measured data)
o=os.environ.get("SOWCAST_REC_DIR","/mnt/user-data/outputs/")
reg=pd.read_csv(o+"sowcast_regions.csv"); cro=pd.read_csv(o+"sowcast_crops.csv"); fit=pd.read_csv(o+"sowcast_region_crop_fit.csv"); rot=pd.read_csv(o+"sowcast_rotations.csv")
for c in ["good_after","avoid_after"]: cro[c]=cro[c].fillna("")
reg["common_crops_in_area"]=reg["common_crops_in_area"].fillna("")
fit["limits"]=fit["limits"].fillna("")
C={r.id:r for r in cro.itertuples(index=False)}
R={r.id:r for r in reg.itertuples(index=False)}
F={(r.region_id,r.crop_id):r for r in fit.itertuples(index=False)}
COMMON={r.id:set(x for x in r.common_crops_in_area.split("|") if x) for r in reg.itertuples(index=False)}
PERENN={"cashew","oil_palm","rubber","cover_legume"}
DRAIN={"cassava","sugarcane","maize"}
MC={"rice":"staple","salt_rice":"staple","maize":"staple","sorghum":"staple","sweet_potato":"staple","cassava":"industrial","sugarcane":"industrial","oil_palm":"industrial","rubber":"industrial","cashew":"industrial",
"soybean":"pulse_oilseed","groundnut":"pulse_oilseed","green_gram":"pulse_oilseed","black_gram":"pulse_oilseed","cowpea":"pulse_oilseed","pigeon_pea":"pulse_oilseed","chickpea":"pulse_oilseed","sesame":"pulse_oilseed","sunflower":"pulse_oilseed",
"potato":"fresh","watermelon":"fresh","vegetables":"fresh","pineapple":"fresh","sunn_hemp":"soil","cover_legume":"soil"}
TF={"self":{"staple":1,"pulse_oilseed":.8,"fresh":.6,"industrial":.4,"soil":.3},
    "local_fresh":{"fresh":1,"pulse_oilseed":.7,"staple":.6,"industrial":.4,"soil":.3},
    "commodity":{"industrial":.9,"pulse_oilseed":1,"staple":.7,"fresh":.5,"soil":.3},
    "mixed":{k:.7 for k in ["staple","pulse_oilseed","fresh","industrial","soil"]}}
GOALS={"soil_health":dict(soil=.50,suit=.20,resil=.15,water=.05,market=.05,cost=.05),
"market_income":dict(market=.45,suit=.25,cost=.10,resil=.10,soil=.10,water=0),
"water_saving":dict(water=.45,suit=.25,resil=.15,soil=.10,market=.05,cost=0),
"low_risk":dict(resil=.45,suit=.25,water=.15,soil=.10,market=.05,cost=0),
"low_cost_labour":dict(cost=.45,suit=.25,market=.15,soil=.10,resil=.05,water=0),
"balanced":dict(suit=.25,soil=.20,market=.20,resil=.15,water=.10,cost=.10)}
GOAL_LABEL={"soil_health":"Best for soil health","market_income":"Best for market value","water_saving":"Best for saving water","low_risk":"Best for low risk (flood, drought, salt)","low_cost_labour":"Best for low cost and labour","balanced":"Best balanced choice"}
WATER={"rainfed":0,"limited":1,"irrigated":3}
clamp=lambda x,a=0.0,b=1.0:max(a,min(b,x))

def slot(c):
    if c.id in PERENN: return "perennial"
    if c.season_days>=250 or c.id=="pineapple": return "long"
    if c.dry_season_crop: return "dry"
    if "wet or dry" in c.season: return "either"
    return "wet"

def wpart(r,c,irr):
    rs=r.rain_mm_approx*0.85; ratio=rs/c.seasonal_rain_need_mm+irr*0.15
    if c.dry_season_crop: ratio=max(ratio,0.5+0.15*irr)
    f=1.8-0.25*c.drought_tolerance
    w=1.0 if ratio>=1 else clamp(1-(1-ratio)*f)
    if r.rain_mm_approx>2500 and c.drought_tolerance>=4: w*=1-0.5*clamp((r.rain_mm_approx-2500)/2500)*(c.drought_tolerance-2)/3
    return w

def crop_fit(rid,cid,irr):
    r=R[rid]; c=C[cid]; row=F[(rid,cid)]; irr0=r.irrigation_access_0_3
    w0=wpart(r,c,irr0); w1=wpart(r,c,irr); f=row.fit
    if irr!=irr0:
        eps=.05; k=((w1+eps)/(w0+eps))**0.25
        raw=50+f*50/95; raw*=k; f=clamp((raw-50)/50)*95
    return f,w1,row

def base(x): return "rice" if x in("rice","salt_rice") else x
def valid(seq,tree):
    if tree: return True
    n=len(seq)
    if len(set(base(x) for x in seq))<n: return False
    if all(C[x].nitrogen_fixing for x in seq): return False   # legume-only rotations lack a cereal/other break (DZ1)
    for i in range(n):
        prev=seq[i-1]; nxt=seq[i]
        if prev in [x for x in C[nxt].avoid_after.split("|") if x]: return False
    return True

def score_seq(rid,seq,tree,target,irr):
    r=R[rid]; cs=[C[x] for x in seq]; n=len(seq)
    fits=[];wps=[]
    for x in seq:
        f,w,_=crop_fit(rid,x,irr); fits.append(f); wps.append(w)
    suit=sum(fits)/n/95
    legs=[c for c in cs if c.nitrogen_fixing]; cers=[c for c in cs if c.family=="grass"]
    fix=min(1.0,len(legs)/n*2); cl=1.0 if (legs and cers) else 0.0
    distinct=len(set(seq)); div=min(1.0,(distinct+(1 if tree else 0))/3)
    reps=0 if tree else (sum(1 for i in range(n) if seq[i]==seq[(i+1)%n]))
    om=sum(c.organic_matter for c in cs)/n/5; cover=sum(c.erosion_cover for c in cs)/n/5
    degr=1.0 if (r.soil_degraded==1 or r.soil_texture in("sandy","sandy_loam")) else 0.4
    drain=sum(1 for x in seq if x in DRAIN)/n*degr
    soil=clamp(0.30*fix+0.20*cl+0.15*div+0.15*om+0.20*cover-0.20*drain-0.15*(reps/n))
    tf=TF[target]
    ms=[0.45*c.relative_income_1_5/5+0.30*c.market/5+0.25*tf[MC[c.id]] for c in cs]
    stor=sum(c.storage_difficulty_1_5 for c in cs)/n/5; sw=0.5 if target=="self" else 1.0
    common=sum(1 for x in seq if x in COMMON[rid])/n
    market=clamp(sum(ms)/n-0.15*sw*stor+0.05*common)
    wneed=sum(c.water_need for c in cs)/n/5
    water=clamp(0.6*(sum(wps)/n)+0.4*(1-wneed))
    risk=sum(F[(rid,x)].risk_part for x in seq)/n
    md=sum(c.drought_tolerance for c in cs)/n; mf=sum(c.flood_tolerance for c in cs)/n; ms_=sum(c.salinity_tolerance for c in cs)/n
    wd=min(1.0,r.dry_months_approx/6)*(1.5 if r.rain_mm_approx<1000 else 1.0); wf=r.flood_risk_0_3/3; ws=r.salinity_risk_0_3/3; tot=wd+wf+ws
    stress=0.5*(md+mf)/5 if tot<=0.001 else (wd*md+wf*mf+ws*ms_)/tot/5
    resil=clamp(0.4*risk+0.3*stress+0.3*div)
    cn=[(0.35*c.fertiliser_need_1_5+0.30*c.labour_need_1_5+0.20*c.seed_cost_1_5+0.15*c.pest_difficulty_1_5)/5 for c in cs]
    cost=clamp(1-sum(cn)/n+0.05*cl)
    mult=1.0; irr_eff=irr
    for c in cs:
        if slot(c)=="dry" and c.id!="chickpea":
            if irr_eff<1: mult*=0.7
            elif irr_eff<2 and r.dry_months_approx>=4: mult*=0.85
    return dict(suit=suit,soil=soil,market=market,water=water,resil=resil,cost=cost,mult=mult,fix=fix,cl=cl,reps=reps,cover=cover,drain=drain,
                stor=stor,common=common,wneed=wneed,fits=fits)

def candidates(rid,irr):
    r=R[rid]
    if r.tree_crop_dominated==1:
        return [("young-tree intercrop plan",(x,),True) for x in ["cover_legume","sunn_hemp","cowpea","groundnut","green_gram","vegetables","sweet_potato","pineapple"]]
    ids=[x for x in cro.id if x not in PERENN]
    fv={x:crop_fit(rid,x,irr)[0] for x in ids}
    pool=[x for x in sorted(ids,key=lambda x:-fv[x]) if fv[x]>=45][:10]
    wetcap=[x for x in pool if slot(C[x]) in("wet","either")]
    drycap=[x for x in pool if slot(C[x]) in("dry","either")]
    out=[]
    for w in wetcap:
        for d in drycap:
            if w!=d and C[w].season_days+C[d].season_days+30<=365: out.append(("1-year double crop (wet season, then dry season)",(w,d),False))
    for a,b in itertools.permutations(wetcap,2): out.append(("2-year rotation (wet-season crops in different years)",(a,b),False))
    for L in [x for x in pool if slot(C[x])=="long"]:
        for m in [x for x in pool+["sunn_hemp"] if C[x].nitrogen_fixing and slot(C[x]) in("wet","either")]:
            if m!=L: out.append(("2-year cycle (long crop, then legume)",(L,m),False))
    top8=wetcap[:8]
    for t in itertools.permutations(top8,3):
        if any(C[x].nitrogen_fixing for x in t): out.append(("3-year rotation",t,False))
    return out

_CACHE={}
SUBS=["soil","market","water","resil","cost","suit"]
def evaluate(rid,target,irr):
    key=(rid,target,irr)
    if key in _CACHE: return _CACHE[key]
    ev=[]
    for typ,seq,tree in candidates(rid,irr):
        if not valid(seq,tree): continue
        ev.append((typ,seq,tree,score_seq(rid,seq,tree,target,irr)))
    mm={k:(min(e[3][k] for e in ev),max(e[3][k] for e in ev)) for k in SUBS}
    _CACHE[key]=(ev,mm); return _CACHE[key]

def norm(s,mm,k):
    lo,hi=mm[k]
    return 0.5 if hi-lo<1e-9 else clamp((s[k]-lo)/(hi-lo))

def total(goal,s,mm):
    w=GOALS[goal]
    return 100*sum(w[k]*norm(s,mm,k) for k in SUBS)*s["mult"]

def rank_goal(rid,goal,target="mixed",water_source=None,topn=3):
    r=R[rid]; irr=r.irrigation_access_0_3 if water_source is None else WATER[water_source]
    ev,mm=evaluate(rid,target,irr)
    res=sorted([(total(goal,s,mm),typ,seq,tree,s) for typ,seq,tree,s in ev],key=lambda t:(-round(t[0],6),'|'.join(t[2])))
    out=[];seen=set()
    for tot,typ,seq,tree,s in res:
        key=frozenset(seq)
        if key in seen: continue
        seen.add(key); out.append((tot,typ,seq,tree,s))
        if len(out)==topn: break
    return out

def short(x): return C[x].name.split(" (")[0]
def reasons(rid,seq,tree,s,goal,target,irr):
    r=R[rid]; cs=[C[x] for x in seq]; n=len(seq)
    legs=[c for c in cs if c.nitrogen_fixing]; cers=[c for c in cs if c.family=="grass"]
    out={}
    soil=[]
    if legs: soil.append(f"{' and '.join(dict.fromkeys(short(c.id) for c in legs))} fix nitrogen ({legs[0].n_fixed_kg_ha_rough})")
    if legs and cers: soil.append("alternating legume and cereal breaks disease cycles and cuts fertiliser need")
    if s["reps"]==0 and n>1: soil.append("no crop repeats back-to-back on the same plot")
    soil.append(f"average ground-cover score {s['cover']*5:.1f}/5"+(" (helps on sloping land)" if r.slope_pct_approx>=8 else ""))
    dr=[short(x) for x in seq if x in DRAIN]
    if dr and s["drain"]>0: soil.append(f"{', '.join(dr)} drain soil nutrients here, so add organic matter or green manure")
    out["soil"]=soil
    inc=sum(c.relative_income_1_5 for c in cs)/n
    mk=[f"average income score {inc:.1f}/5 (rough); sold as {', '.join(dict.fromkeys(MC[x].replace('_',' / ') for x in seq))}"]
    per=[short(c.id) for c in cs if c.storage_difficulty_1_5>=4]
    if per: mk.append(f"hard to store ({', '.join(per)}): arrange a buyer before planting")
    if s["common"]>0: mk.append("includes crops already grown locally (existing know-how and buyers)")
    out["market"]=mk
    rs=r.rain_mm_approx*0.85
    irtxt={0:"rain only",1:"limited water (well or small pump)",2:"partial irrigation",3:"good irrigation"}[irr]
    out["water"]=[f"average water need {s['wneed']*5:.1f}/5 (lower is better); season rain ~{rs:.0f} mm; water source: {irtxt}"]
    st=[]
    if r.dry_months_approx>=5 or r.rain_mm_approx<1000: st.append("drought")
    if r.flood_risk_0_3>=2: st.append("flooding")
    if r.salinity_risk_0_3>=2: st.append("salinity")
    out["resil"]=[("tolerates "+", ".join(st)+" common here" if st else "no strong climate hazard in this area")+f"; {len(set(seq))} different crop(s) spread the risk"]
    out["cost"]=[f"mean labour need {sum(c.labour_need_1_5 for c in cs)/n:.1f}/5, fertiliser need {sum(c.fertiliser_need_1_5 for c in cs)/n:.1f}/5 (legumes reduce fertiliser need)"]
    pick={"soil_health":["soil"],"market_income":["market"],"water_saving":["water"],"low_risk":["resil"],"low_cost_labour":["cost"],"balanced":["soil","market"]}[goal]
    why=[]
    for k in pick: why+=out[k][:3 if len(pick)==1 else 2]
    return why
def cautions(rid,seq,irr):
    r=R[rid]; c=[]
    for x in seq:
        for t in F[(rid,x)].limits.split("; "):
            if t and t not in c: c.append(f"{short(x)}: {t}")
    for x in seq:
        if slot(C[x])=="dry" and x!="chickpea" and irr<2: c.append(f"{short(x)} needs dry-season water; check your well, pump or canal access")
    return c[:4]

def current_scores(rid,target,irr):
    row=rot[(rot.region_id==rid)&(rot.option=="current")]
    if row.empty: return None
    seq=[x for x in row.iloc[0].sequence.replace("+","|").split("|") if x in C]
    if not seq or "perennial_tree" in row.iloc[0].sequence: return None
    s=score_seq(rid,tuple(seq),False,target,irr); return seq,s

KEY={"soil_health":["soil"],"market_income":["market"],"water_saving":["water"],"low_risk":["resil"],"low_cost_labour":["cost"],"balanced":["soil","market","water","resil","cost"]}
def key_abs(g,s): return 100*sum(s[k] for k in KEY[g])/len(KEY[g])
def build(target="mixed",water_source=None):
    rows=[];js={}
    for r in reg.itertuples(index=False):
        irr=r.irrigation_access_0_3 if water_source is None else WATER[water_source]
        cur=current_scores(r.id,target,irr); mm=evaluate(r.id,target,irr)[1]
        js[r.id]={"region":r.region,"country":r.country,"rotation_relevance":r.rotation_relevance,"goals":{}}
        for g in GOALS:
            picks=rank_goal(r.id,g,target,water_source); lst=[]
            for k,(tot,typ,seq,tree,s) in enumerate(picks,1):
                seqtxt=("perennial_tree+" if tree else "")+"|".join(seq)
                vs=None if cur is None else round(key_abs(g,s)-key_abs(g,cur[1]),1)
                why=reasons(r.id,seq,tree,s,g,target,irr); cau=cautions(r.id,seq,irr)
                item=dict(region_id=r.id,country=r.country,region=r.region,goal=g,goal_label=GOAL_LABEL[g],rank=k,sequence=seqtxt,
                    sequence_names=(" + " if tree else " -> ").join((["Tree crop"] if tree else [])+[short(x) for x in seq]) if tree else " -> ".join(short(x) for x in seq),
                    plan_type=typ,goal_match_score=round(tot,1),soil_score=round(100*s["soil"]),market_score=round(100*s["market"]),water_score=round(100*s["water"]),
                    risk_resilience_score=round(100*s["resil"]),low_cost_score=round(100*s["cost"]),crop_suitability_score=round(100*s["suit"]),
                    change_vs_current_key_score=vs,why="; ".join(why),cautions="; ".join(cau),
                    confidence="medium" if r.confidence=="medium" else "low",basis="rule-based, goal-weighted score on draft priors; not validated against field trials")
                rows.append(item); lst.append(item)
            js[r.id]["goals"][g]=lst
        js[r.id]["current_rotation"]=None if cur is None else dict(sequence="|".join(cur[0]),scores={k:round(100*cur[1][k]) for k in ["soil","market","water","resil","cost","suit"]})
    return rows,js

if __name__=="__main__":
    rows,js=build()
    pd.DataFrame(rows).to_csv(o+"sowcast_rotation_recommendations.csv",index=False)
    json.dump(js,open(o+"sowcast_rotation_recommendations.json","w"),indent=1)
    df=pd.DataFrame(rows); print(df.shape)
    pd.set_option("display.width",250); pd.set_option("display.max_colwidth",70)
    for rid in ["mm-dry-zone","th-isan","vn-mekong","my-kedah-perlis","my-johor"]:
        print("\n",rid)
        print(df[(df.region_id==rid)&(df["rank"]==1)][["goal","sequence_names","goal_match_score","soil_score","market_score","water_score","change_vs_current_key_score"]].to_string(index=False))
