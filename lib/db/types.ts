
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "_migrations": {
                  Row: {
                    "applied_at": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string,"name": string
                  }
                  Update: {
                    "applied_at"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"agent_runs": {
                  Row: {
                    "finished_at": string | null,"id": string,"provider": string | null,"recipe_id": string | null,"started_at": string,"status": string,"tokens_in": number | null,"tokens_out": number | null,"total_ms": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string | null,"id"?: string,"provider"?: string | null,"recipe_id"?: string | null,"started_at"?: string,"status"?: string,"tokens_in"?: number | null,"tokens_out"?: number | null,"total_ms"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "finished_at"?: string | null,"id"?: string,"provider"?: string | null,"recipe_id"?: string | null,"started_at"?: string,"status"?: string,"tokens_in"?: number | null,"tokens_out"?: number | null,"total_ms"?: number | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_runs_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_steps": {
                  Row: {
                    "created_at": string,"error": string | null,"id": number,"input": Json | null,"model": string | null,"ms": number | null,"output": Json | null,"prompt_version": string | null,"run_id": string,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"id"?: number,"input"?: Json | null,"model"?: string | null,"ms"?: number | null,"output"?: Json | null,"prompt_version"?: string | null,"run_id": string,"stage": string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"id"?: number,"input"?: Json | null,"model"?: string | null,"ms"?: number | null,"output"?: Json | null,"prompt_version"?: string | null,"run_id"?: string,"stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_steps_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "agent_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"basket_history": {
                  Row: {
                    "added_at": string,"concept_id": string | null,"facets": NonNullable<Json>,"id": number,"item_id": string | null,"kind": string,"label": string | null,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"concept_id"?: string | null,"facets"?: NonNullable<Json>,"id"?: number,"item_id"?: string | null,"kind": string,"label"?: string | null,"source": string,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"concept_id"?: string | null,"facets"?: NonNullable<Json>,"id"?: number,"item_id"?: string | null,"kind"?: string,"label"?: string | null,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"basket_items": {
                  Row: {
                    "alternative_id": string | null,"basket_id": string,"concept_id": string | null,"created_at": string,"facets": NonNullable<Json>,"for_ingredient": string | null,"id": string,"item_id": string | null,"kind": string,"label": string | null,"packages": number,"pinned_item_id": string | null,"recipe_id": string | null,"required_qty": number | null,"required_unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alternative_id"?: string | null,"basket_id": string,"concept_id"?: string | null,"created_at"?: string,"facets"?: NonNullable<Json>,"for_ingredient"?: string | null,"id"?: string,"item_id"?: string | null,"kind": string,"label"?: string | null,"packages"?: number,"pinned_item_id"?: string | null,"recipe_id"?: string | null,"required_qty"?: number | null,"required_unit"?: string | null
                  }
                  Update: {
                    "alternative_id"?: string | null,"basket_id"?: string,"concept_id"?: string | null,"created_at"?: string,"facets"?: NonNullable<Json>,"for_ingredient"?: string | null,"id"?: string,"item_id"?: string | null,"kind"?: string,"label"?: string | null,"packages"?: number,"pinned_item_id"?: string | null,"recipe_id"?: string | null,"required_qty"?: number | null,"required_unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "basket_items_alternative_id_fkey"
      columns: ["alternative_id"]
isOneToOne: false
      referencedRelation: "ingredient_alternatives"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "basket_items_basket_id_fkey"
      columns: ["basket_id"]
isOneToOne: false
      referencedRelation: "baskets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "basket_items_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"baskets": {
                  Row: {
                    "created_at": string,"id": string,"nutrition_metric": string,"nutrition_order": string,"strategy": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nutrition_metric"?: string,"nutrition_order"?: string,"strategy"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nutrition_metric"?: string,"nutrition_order"?: string,"strategy"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chains": {
                  Row: {
                    "code": string,"kind": string,"logo_url": string | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"kind"?: string,"logo_url"?: string | null,"name": string
                  }
                  Update: {
                    "code"?: string,"kind"?: string,"logo_url"?: string | null,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"concepts": {
                  Row: {
                    "concept_id": string,"korijeni": (string)[],"n_products": number,"naziv": string,"obitelj": string | null,"put_nazivi": string | null,"razina": number | null,"roditelj": string | null,"run": string | null,"sinonimi": (string)[],"zamjenjuje": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "concept_id": string,"korijeni"?: (string)[],"n_products"?: number,"naziv": string,"obitelj"?: string | null,"put_nazivi"?: string | null,"razina"?: number | null,"roditelj"?: string | null,"run"?: string | null,"sinonimi"?: (string)[],"zamjenjuje"?: (string)[]
                  }
                  Update: {
                    "concept_id"?: string,"korijeni"?: (string)[],"n_products"?: number,"naziv"?: string,"obitelj"?: string | null,"put_nazivi"?: string | null,"razina"?: number | null,"roditelj"?: string | null,"run"?: string | null,"sinonimi"?: (string)[],"zamjenjuje"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"dish_research": {
                  Row: {
                    "created_at": string,"dish": string,"key": string,"method": string,"model": string | null,"notes_hr": string,"sources": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dish": string,"key": string,"method": string,"model"?: string | null,"notes_hr": string,"sources"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"dish"?: string,"key"?: string,"method"?: string,"model"?: string | null,"notes_hr"?: string,"sources"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"ingredient_alternatives": {
                  Row: {
                    "concept_id": string | null,"confidence": number | null,"facets": NonNullable<Json>,"has_products": boolean,"id": string,"is_selected": boolean,"label_hr": string | null,"rank": number,"ratio": number | null,"reasoning_hr": string | null,"recipe_ingredient_id": string,"required_qty": number | null,"required_unit": string | null,"source_urls": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "concept_id"?: string | null,"confidence"?: number | null,"facets"?: NonNullable<Json>,"has_products"?: boolean,"id"?: string,"is_selected"?: boolean,"label_hr"?: string | null,"rank": number,"ratio"?: number | null,"reasoning_hr"?: string | null,"recipe_ingredient_id": string,"required_qty"?: number | null,"required_unit"?: string | null,"source_urls"?: NonNullable<Json>
                  }
                  Update: {
                    "concept_id"?: string | null,"confidence"?: number | null,"facets"?: NonNullable<Json>,"has_products"?: boolean,"id"?: string,"is_selected"?: boolean,"label_hr"?: string | null,"rank"?: number,"ratio"?: number | null,"reasoning_hr"?: string | null,"recipe_ingredient_id"?: string,"required_qty"?: number | null,"required_unit"?: string | null,"source_urls"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredient_alternatives_recipe_ingredient_id_fkey"
      columns: ["recipe_ingredient_id"]
isOneToOne: false
      referencedRelation: "recipe_ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "aliases": (string)[],"category": string | null,"grams_per_piece": number | null,"is_vegan": boolean,"name_hr": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"category"?: string | null,"grams_per_piece"?: number | null,"is_vegan": boolean,"name_hr": string,"slug": string
                  }
                  Update: {
                    "aliases"?: (string)[],"category"?: string | null,"grams_per_piece"?: number | null,"is_vegan"?: boolean,"name_hr"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"offers": {
                  Row: {
                    "akcija": boolean,"akcija_price": number | null,"cheapest_store_address": string | null,"cheapest_store_id": string | null,"median_month": number | null,"n_stores": number | null,"n_stores_akcija": number | null,"n_stores_prilika": number | null,"pct_vs_median": number | null,"price": number,"price_avg": number | null,"price_date": string | null,"prilika": boolean,"product_key": string,"regular_price": number | null,"seller": string,"source": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "akcija"?: boolean,"akcija_price"?: number | null,"cheapest_store_address"?: string | null,"cheapest_store_id"?: string | null,"median_month"?: number | null,"n_stores"?: number | null,"n_stores_akcija"?: number | null,"n_stores_prilika"?: number | null,"pct_vs_median"?: number | null,"price": number,"price_avg"?: number | null,"price_date"?: string | null,"prilika"?: boolean,"product_key": string,"regular_price"?: number | null,"seller": string,"source": string,"url"?: string | null
                  }
                  Update: {
                    "akcija"?: boolean,"akcija_price"?: number | null,"cheapest_store_address"?: string | null,"cheapest_store_id"?: string | null,"median_month"?: number | null,"n_stores"?: number | null,"n_stores_akcija"?: number | null,"n_stores_prilika"?: number | null,"pct_vs_median"?: number | null,"price"?: number,"price_avg"?: number | null,"price_date"?: string | null,"prilika"?: boolean,"product_key"?: string,"regular_price"?: number | null,"seller"?: string,"source"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_product_key_fkey"
      columns: ["product_key"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["product_key"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["product_key"]
isOneToOne: false
      referencedRelation: "v_product_best"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["product_key"]
isOneToOne: false
      referencedRelation: "v_product_offers"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["product_key"]
isOneToOne: false
      referencedRelation: "v_products"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_seller_fkey"
      columns: ["seller"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    }
                  ]
                },"products": {
                  Row: {
                    "atr_namjena": (string)[],"atr_oblik_obrada": (string)[],"atr_okus": (string)[],"atr_porijeklo": (string)[],"atr_prehrambena_svojstva": (string)[],"atr_zasladenost": (string)[],"brand": string | null,"brands": (string)[],"carbohydrates": number | null,"concept_id": string | null,"concept_put": (string)[],"evidence_class": string | null,"fat": number | null,"fiber": number | null,"has_barcode": boolean,"kcal": number | null,"name": string,"name_norm": string,"nutrition_izvor": string | null,"nutrition_izvor_opis": string | null,"nutrition_nedostaje": (string)[],"nutrition_praznina_opis": string | null,"nutrition_procijenjeno": boolean | null,"pakiranje_jedinica": string | null,"pakiranje_kolicina": number | null,"pakiranje_komada": number,"product_key": string,"protein": number | null,"salt": number | null,"saturated_fat": number | null,"search_norm": string,"search_text": string | null,"std_naziv": string | null,"sugars": number | null,"tags": (string)[],"url": string | null,"vegan_class": string,"vegan_evidence": Json | null,"vegan_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atr_namjena"?: (string)[],"atr_oblik_obrada"?: (string)[],"atr_okus"?: (string)[],"atr_porijeklo"?: (string)[],"atr_prehrambena_svojstva"?: (string)[],"atr_zasladenost"?: (string)[],"brand"?: string | null,"brands"?: (string)[],"carbohydrates"?: number | null,"concept_id"?: string | null,"concept_put"?: (string)[],"evidence_class"?: string | null,"fat"?: number | null,"fiber"?: number | null,"has_barcode"?: boolean,"kcal"?: number | null,"name": string,"name_norm"?: string,"nutrition_izvor"?: string | null,"nutrition_izvor_opis"?: string | null,"nutrition_nedostaje"?: (string)[],"nutrition_praznina_opis"?: string | null,"nutrition_procijenjeno"?: boolean | null,"pakiranje_jedinica"?: string | null,"pakiranje_kolicina"?: number | null,"pakiranje_komada"?: number,"product_key": string,"protein"?: number | null,"salt"?: number | null,"saturated_fat"?: number | null,"search_norm"?: string,"search_text"?: string | null,"std_naziv"?: string | null,"sugars"?: number | null,"tags"?: (string)[],"url"?: string | null,"vegan_class": string,"vegan_evidence"?: Json | null,"vegan_reason"?: string | null
                  }
                  Update: {
                    "atr_namjena"?: (string)[],"atr_oblik_obrada"?: (string)[],"atr_okus"?: (string)[],"atr_porijeklo"?: (string)[],"atr_prehrambena_svojstva"?: (string)[],"atr_zasladenost"?: (string)[],"brand"?: string | null,"brands"?: (string)[],"carbohydrates"?: number | null,"concept_id"?: string | null,"concept_put"?: (string)[],"evidence_class"?: string | null,"fat"?: number | null,"fiber"?: number | null,"has_barcode"?: boolean,"kcal"?: number | null,"name"?: string,"name_norm"?: string,"nutrition_izvor"?: string | null,"nutrition_izvor_opis"?: string | null,"nutrition_nedostaje"?: (string)[],"nutrition_praznina_opis"?: string | null,"nutrition_procijenjeno"?: boolean | null,"pakiranje_jedinica"?: string | null,"pakiranje_kolicina"?: number | null,"pakiranje_komada"?: number,"product_key"?: string,"protein"?: number | null,"salt"?: number | null,"saturated_fat"?: number | null,"search_norm"?: string,"search_text"?: string | null,"std_naziv"?: string | null,"sugars"?: number | null,"tags"?: (string)[],"url"?: string | null,"vegan_class"?: string,"vegan_evidence"?: Json | null,"vegan_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["concept_id"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "v_concepts"
      referencedColumns: ["concept_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"excluded_tags": (string)[],"household_size": number,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"excluded_tags"?: (string)[],"household_size"?: number,"id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"excluded_tags"?: (string)[],"household_size"?: number,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "confidence": number | null,"id": string,"ingredient_slug": string | null,"is_vegan": boolean | null,"name_hr": string | null,"position": number,"quantity": number | null,"quantity_estimated": boolean,"raw_text": string,"reason_hr": string | null,"recipe_id": string,"role": string | null,"status": string | null,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence"?: number | null,"id"?: string,"ingredient_slug"?: string | null,"is_vegan"?: boolean | null,"name_hr"?: string | null,"position": number,"quantity"?: number | null,"quantity_estimated"?: boolean,"raw_text": string,"reason_hr"?: string | null,"recipe_id": string,"role"?: string | null,"status"?: string | null,"unit"?: string | null
                  }
                  Update: {
                    "confidence"?: number | null,"id"?: string,"ingredient_slug"?: string | null,"is_vegan"?: boolean | null,"name_hr"?: string | null,"position"?: number,"quantity"?: number | null,"quantity_estimated"?: boolean,"raw_text"?: string,"reason_hr"?: string | null,"recipe_id"?: string,"role"?: string | null,"status"?: string | null,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "created_at": string,"dish_category": string | null,"dish_notes_hr": string | null,"id": string,"image_url": string | null,"ingest_method": string | null,"raw_text": string,"saved_at": string | null,"servings_original": number | null,"servings_target": number | null,"source_kind": string,"source_name": string | null,"source_url": string | null,"sources": NonNullable<Json>,"status": string,"tip_hr": string | null,"title": string | null,"user_id": string | null,"veganized_steps": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dish_category"?: string | null,"dish_notes_hr"?: string | null,"id"?: string,"image_url"?: string | null,"ingest_method"?: string | null,"raw_text": string,"saved_at"?: string | null,"servings_original"?: number | null,"servings_target"?: number | null,"source_kind": string,"source_name"?: string | null,"source_url"?: string | null,"sources"?: NonNullable<Json>,"status"?: string,"tip_hr"?: string | null,"title"?: string | null,"user_id"?: string | null,"veganized_steps"?: Json | null
                  }
                  Update: {
                    "created_at"?: string,"dish_category"?: string | null,"dish_notes_hr"?: string | null,"id"?: string,"image_url"?: string | null,"ingest_method"?: string | null,"raw_text"?: string,"saved_at"?: string | null,"servings_original"?: number | null,"servings_target"?: number | null,"source_kind"?: string,"source_name"?: string | null,"source_url"?: string | null,"sources"?: NonNullable<Json>,"status"?: string,"tip_hr"?: string | null,"title"?: string | null,"user_id"?: string | null,"veganized_steps"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"substitution_research": {
                  Row: {
                    "created_at": string,"dish_category": string,"ingredient": string,"key": string,"method": string,"model": string | null,"notes_hr": string,"role": string,"sources": NonNullable<Json>,"suggestions": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dish_category": string,"ingredient": string,"key": string,"method": string,"model"?: string | null,"notes_hr": string,"role": string,"sources"?: NonNullable<Json>,"suggestions"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"dish_category"?: string,"ingredient"?: string,"key"?: string,"method"?: string,"model"?: string | null,"notes_hr"?: string,"role"?: string,"sources"?: NonNullable<Json>,"suggestions"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"substitution_rules": {
                  Row: {
                    "concept_id": string,"id": number,"ingredient_slug": string,"notes_hr": string | null,"prefer": NonNullable<Json>,"rank": number,"ratio": number,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concept_id": string,"id"?: number,"ingredient_slug": string,"notes_hr"?: string | null,"prefer"?: NonNullable<Json>,"rank"?: number,"ratio"?: number,"role"?: string
                  }
                  Update: {
                    "concept_id"?: string,"id"?: number,"ingredient_slug"?: string,"notes_hr"?: string | null,"prefer"?: NonNullable<Json>,"rank"?: number,"ratio"?: number,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "substitution_rules_ingredient_slug_fkey"
      columns: ["ingredient_slug"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Views: {
            "best_offers": {
                  Row: {
                    "any_akcija": boolean | null,"any_prilika": boolean | null,"chain_code": string | null,"chain_kind": string | null,"chain_logo_url": string | null,"chain_name": string | null,"cheapest_store_address": string | null,"discount_pct": number | null,"is_akcija": boolean | null,"is_prilika": boolean | null,"item_id": string | null,"max_discount_pct": number | null,"n_chains": number | null,"n_stores": number | null,"n_stores_akcija": number | null,"pct_vs_median": number | null,"price": number | null,"price_avg": number | null,"price_date": string | null,"regular_price": number | null,"store_id": string | null,"unit_price_per_kg_l": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["product_key"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_best"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_offers"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_products"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_seller_fkey"
      columns: ["chain_code"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    }
                  ]
                },"v_best_offers": {
                  Row: {
                    "any_akcija": boolean | null,"any_prilika": boolean | null,"chain_code": string | null,"chain_kind": string | null,"chain_logo_url": string | null,"chain_name": string | null,"cheapest_store_address": string | null,"discount_pct": number | null,"is_akcija": boolean | null,"is_prilika": boolean | null,"item_id": string | null,"max_discount_pct": number | null,"n_chains": number | null,"n_stores": number | null,"n_stores_akcija": number | null,"pct_vs_median": number | null,"price": number | null,"price_avg": number | null,"price_date": string | null,"regular_price": number | null,"store_id": string | null,"unit_price_per_kg_l": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["product_key"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_best"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_offers"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_products"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_seller_fkey"
      columns: ["chain_code"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    }
                  ]
                },"v_concepts": {
                  Row: {
                    "concept_id": string | null,"group_name": string | null,"n_products": number | null,"name_hr": string | null,"parent": string | null,"run": string | null,"zamjenjuje": (string)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "concept_id"?: string | null,"group_name"?: string | null,"n_products"?: number | null,"name_hr"?: string | null,"parent"?: string | null,"run"?: string | null,"zamjenjuje"?: (string)[] | null
                         }
                        Update: {
                           "concept_id"?: string | null,"group_name"?: string | null,"n_products"?: number | null,"name_hr"?: string | null,"parent"?: string | null,"run"?: string | null,"zamjenjuje"?: (string)[] | null
                         }
                        Relationships: [
                    
                  ]
                },"v_offers": {
                  Row: {
                    "akcija_price": number | null,"chain_code": string | null,"chain_kind": string | null,"chain_logo_url": string | null,"chain_name": string | null,"cheapest_store_address": string | null,"cheapest_store_id": string | null,"discount_pct": number | null,"is_akcija": boolean | null,"is_chainwide": boolean | null,"is_prilika": boolean | null,"item_id": string | null,"median_month": number | null,"n_stores": number | null,"n_stores_akcija": number | null,"n_stores_prilika": number | null,"pct_vs_median": number | null,"price": number | null,"price_avg": number | null,"price_date": string | null,"regular_price": number | null,"store_address": string | null,"store_city": string | null,"store_id": string | null,"unit_price_per_kg_l": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["product_key"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_best"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_product_offers"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_product_key_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_products"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "offers_seller_fkey"
      columns: ["chain_code"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    }
                  ]
                },"v_product_best": {
                  Row: {
                    "any_akcija": boolean | null,"any_prilika": boolean | null,"barcode": string | null,"brand": string | null,"carbohydrates": number | null,"chain_code": string | null,"chain_kind": string | null,"chain_logo_url": string | null,"chain_name": string | null,"cheapest_store_address": string | null,"concept_group": string | null,"concept_id": string | null,"concept_name": string | null,"concept_put": (string)[] | null,"discount_pct": number | null,"eko": boolean | null,"energy_kcal": number | null,"energy_kj": number | null,"fat": number | null,"fiber": number | null,"image_url": string | null,"is_akcija": boolean | null,"is_prilika": boolean | null,"item_id": string | null,"max_discount_pct": number | null,"n_chains": number | null,"n_stores": number | null,"name": string | null,"namjena": (string)[] | null,"net_qty": number | null,"nutrition_estimated": boolean | null,"nutrition_source": string | null,"nutrition_source_hr": string | null,"oblik": (string)[] | null,"okus": (string)[] | null,"pack_count": number | null,"pct_vs_median": number | null,"price": number | null,"price_avg": number | null,"price_date": string | null,"product_url": string | null,"proteins": number | null,"provjeri": boolean | null,"regular_price": number | null,"salt": number | null,"saturated_fat": number | null,"size_unit": string | null,"size_value": number | null,"std_naziv": string | null,"store_id": string | null,"sugars": number | null,"svojstva": (string)[] | null,"tags": (string)[] | null,"unit_price_per_kg_l": number | null,"vegan_evidence": Json | null,"vegan_reason": string | null,"vegan_status": string | null,"zasladeno": (string)[] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_seller_fkey"
      columns: ["chain_code"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["concept_id"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "v_concepts"
      referencedColumns: ["concept_id"]
    }
                  ]
                },"v_product_offers": {
                  Row: {
                    "akcija_price": number | null,"barcode": string | null,"brand": string | null,"carbohydrates": number | null,"chain_code": string | null,"chain_kind": string | null,"chain_logo_url": string | null,"chain_name": string | null,"cheapest_store_address": string | null,"cheapest_store_id": string | null,"concept_group": string | null,"concept_id": string | null,"concept_name": string | null,"concept_put": (string)[] | null,"discount_pct": number | null,"eko": boolean | null,"energy_kcal": number | null,"energy_kj": number | null,"fat": number | null,"fiber": number | null,"image_url": string | null,"is_akcija": boolean | null,"is_chainwide": boolean | null,"is_prilika": boolean | null,"item_id": string | null,"median_month": number | null,"n_stores": number | null,"n_stores_akcija": number | null,"n_stores_prilika": number | null,"name": string | null,"namjena": (string)[] | null,"net_qty": number | null,"nutrition_estimated": boolean | null,"nutrition_source": string | null,"nutrition_source_hr": string | null,"oblik": (string)[] | null,"okus": (string)[] | null,"pack_count": number | null,"pct_vs_median": number | null,"price": number | null,"price_avg": number | null,"price_date": string | null,"product_url": string | null,"proteins": number | null,"provjeri": boolean | null,"regular_price": number | null,"salt": number | null,"saturated_fat": number | null,"size_unit": string | null,"size_value": number | null,"std_naziv": string | null,"store_address": string | null,"store_city": string | null,"store_id": string | null,"sugars": number | null,"svojstva": (string)[] | null,"tags": (string)[] | null,"unit_price_per_kg_l": number | null,"vegan_evidence": Json | null,"vegan_reason": string | null,"vegan_status": string | null,"zasladeno": (string)[] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_seller_fkey"
      columns: ["chain_code"]
isOneToOne: false
      referencedRelation: "chains"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["concept_id"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "v_concepts"
      referencedColumns: ["concept_id"]
    }
                  ]
                },"v_products": {
                  Row: {
                    "barcode": string | null,"brand": string | null,"carbohydrates": number | null,"concept_group": string | null,"concept_id": string | null,"concept_name": string | null,"concept_put": (string)[] | null,"eko": boolean | null,"energy_kcal": number | null,"energy_kj": number | null,"fat": number | null,"fiber": number | null,"image_url": string | null,"item_id": string | null,"name": string | null,"namjena": (string)[] | null,"net_qty": number | null,"nutrition_estimated": boolean | null,"nutrition_source": string | null,"nutrition_source_hr": string | null,"oblik": (string)[] | null,"okus": (string)[] | null,"pack_count": number | null,"product_url": string | null,"proteins": number | null,"provjeri": boolean | null,"salt": number | null,"saturated_fat": number | null,"size_unit": string | null,"size_value": number | null,"std_naziv": string | null,"sugars": number | null,"svojstva": (string)[] | null,"tags": (string)[] | null,"vegan_evidence": Json | null,"vegan_reason": string | null,"vegan_status": string | null,"zasladeno": (string)[] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["concept_id"]
    },{
      foreignKeyName: "products_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "v_concepts"
      referencedColumns: ["concept_id"]
    }
                  ]
                },"v_rules": {
                  Row: {
                    "concept_group": string | null,"concept_id": string | null,"concept_name": string | null,"ingredient_slug": string | null,"notes_hr": string | null,"prefer": Json | null,"rank": number | null,"ratio": number | null,"role": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "substitution_rules_ingredient_slug_fkey"
      columns: ["ingredient_slug"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Functions: {
            "chain_display_name":
{ Args: { "code": string }; Returns: string
                           },
"get_offers":
{ Args: { "p_concept_ids": (string)[],"p_exclude_tags"?: (string)[] }; Returns: {
              "akcija_price": number | null,
"barcode": string | null,
"brand": string | null,
"carbohydrates": number | null,
"chain_code": string | null,
"chain_kind": string | null,
"chain_logo_url": string | null,
"chain_name": string | null,
"cheapest_store_address": string | null,
"cheapest_store_id": string | null,
"concept_group": string | null,
"concept_id": string | null,
"concept_name": string | null,
"concept_put": (string)[] | null,
"discount_pct": number | null,
"eko": boolean | null,
"energy_kcal": number | null,
"energy_kj": number | null,
"fat": number | null,
"fiber": number | null,
"image_url": string | null,
"is_akcija": boolean | null,
"is_chainwide": boolean | null,
"is_prilika": boolean | null,
"item_id": string | null,
"median_month": number | null,
"n_stores": number | null,
"n_stores_akcija": number | null,
"n_stores_prilika": number | null,
"name": string | null,
"namjena": (string)[] | null,
"net_qty": number | null,
"nutrition_estimated": boolean | null,
"nutrition_source": string | null,
"nutrition_source_hr": string | null,
"oblik": (string)[] | null,
"okus": (string)[] | null,
"pack_count": number | null,
"pct_vs_median": number | null,
"price": number | null,
"price_avg": number | null,
"price_date": string | null,
"product_url": string | null,
"proteins": number | null,
"provjeri": boolean | null,
"regular_price": number | null,
"salt": number | null,
"saturated_fat": number | null,
"size_unit": string | null,
"size_value": number | null,
"std_naziv": string | null,
"store_address": string | null,
"store_city": string | null,
"store_id": string | null,
"sugars": number | null,
"svojstva": (string)[] | null,
"tags": (string)[] | null,
"unit_price_per_kg_l": number | null,
"vegan_evidence": Json | null,
"vegan_reason": string | null,
"vegan_status": string | null,
"zasladeno": (string)[] | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "v_product_offers"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_offers_for_items":
{ Args: { "p_item_ids": (string)[] }; Returns: {
              "akcija_price": number | null,
"barcode": string | null,
"brand": string | null,
"carbohydrates": number | null,
"chain_code": string | null,
"chain_kind": string | null,
"chain_logo_url": string | null,
"chain_name": string | null,
"cheapest_store_address": string | null,
"cheapest_store_id": string | null,
"concept_group": string | null,
"concept_id": string | null,
"concept_name": string | null,
"concept_put": (string)[] | null,
"discount_pct": number | null,
"eko": boolean | null,
"energy_kcal": number | null,
"energy_kj": number | null,
"fat": number | null,
"fiber": number | null,
"image_url": string | null,
"is_akcija": boolean | null,
"is_chainwide": boolean | null,
"is_prilika": boolean | null,
"item_id": string | null,
"median_month": number | null,
"n_stores": number | null,
"n_stores_akcija": number | null,
"n_stores_prilika": number | null,
"name": string | null,
"namjena": (string)[] | null,
"net_qty": number | null,
"nutrition_estimated": boolean | null,
"nutrition_source": string | null,
"nutrition_source_hr": string | null,
"oblik": (string)[] | null,
"okus": (string)[] | null,
"pack_count": number | null,
"pct_vs_median": number | null,
"price": number | null,
"price_avg": number | null,
"price_date": string | null,
"product_url": string | null,
"proteins": number | null,
"provjeri": boolean | null,
"regular_price": number | null,
"salt": number | null,
"saturated_fat": number | null,
"size_unit": string | null,
"size_value": number | null,
"std_naziv": string | null,
"store_address": string | null,
"store_city": string | null,
"store_id": string | null,
"sugars": number | null,
"svojstva": (string)[] | null,
"tags": (string)[] | null,
"unit_price_per_kg_l": number | null,
"vegan_evidence": Json | null,
"vegan_reason": string | null,
"vegan_status": string | null,
"zasladeno": (string)[] | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "v_product_offers"
        isOneToOne: false
        isSetofReturn: true
      } },
"often_bought":
{ Args: { "p_limit"?: number }; Returns: {
              "concept_id": string,"facets": Json,"item_id": string,"kind": string,"last_added": string,"times": number
            }[]
                           },
"refresh_catalog":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"search_products":
{ Args: { "p_concept_id"?: string,"p_limit"?: number,"p_only_akcija"?: boolean,"p_query": string }; Returns: {
              "any_akcija": boolean,"brand": string,"chain_code": string,"chain_kind": string,"chain_logo_url": string,"chain_name": string,"concept_group": string,"concept_id": string,"discount_pct": number,"eko": boolean,"image_url": string,"is_akcija": boolean,"item_id": string,"match_tier": number,"max_discount_pct": number,"n_chains": number,"n_stores": number,"name": string,"net_qty": number,"pack_count": number,"price": number,"product_url": string,"provjeri": boolean,"regular_price": number,"size_unit": string,"size_value": number,"tags": (string)[],"unit_price_per_kg_l": number,"vegan_status": string
            }[]
                           },
"todays_deals":
{ Args: { "p_limit"?: number }; Returns: {
              "any_akcija": boolean | null,
"any_prilika": boolean | null,
"barcode": string | null,
"brand": string | null,
"carbohydrates": number | null,
"chain_code": string | null,
"chain_kind": string | null,
"chain_logo_url": string | null,
"chain_name": string | null,
"cheapest_store_address": string | null,
"concept_group": string | null,
"concept_id": string | null,
"concept_name": string | null,
"concept_put": (string)[] | null,
"discount_pct": number | null,
"eko": boolean | null,
"energy_kcal": number | null,
"energy_kj": number | null,
"fat": number | null,
"fiber": number | null,
"image_url": string | null,
"is_akcija": boolean | null,
"is_prilika": boolean | null,
"item_id": string | null,
"max_discount_pct": number | null,
"n_chains": number | null,
"n_stores": number | null,
"name": string | null,
"namjena": (string)[] | null,
"net_qty": number | null,
"nutrition_estimated": boolean | null,
"nutrition_source": string | null,
"nutrition_source_hr": string | null,
"oblik": (string)[] | null,
"okus": (string)[] | null,
"pack_count": number | null,
"pct_vs_median": number | null,
"price": number | null,
"price_avg": number | null,
"price_date": string | null,
"product_url": string | null,
"proteins": number | null,
"provjeri": boolean | null,
"regular_price": number | null,
"salt": number | null,
"saturated_fat": number | null,
"size_unit": string | null,
"size_value": number | null,
"std_naziv": string | null,
"store_id": string | null,
"sugars": number | null,
"svojstva": (string)[] | null,
"tags": (string)[] | null,
"unit_price_per_kg_l": number | null,
"vegan_evidence": Json | null,
"vegan_reason": string | null,
"vegan_status": string | null,
"zasladeno": (string)[] | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "v_product_best"
        isOneToOne: false
        isSetofReturn: true
      } },
"try_bool":
{ Args: { "v": string }; Returns: boolean
                           },
"try_date":
{ Args: { "v": string }; Returns: string
                           },
"try_jsonb":
{ Args: { "v": string }; Returns: Json
                           },
"try_numeric":
{ Args: { "v": string }; Returns: number
                           },
"try_text_array":
{ Args: { "v": string }; Returns: (string)[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
